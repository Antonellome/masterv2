
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const db = admin.firestore();
const messaging = admin.messaging();
const REGION = "europe-west1";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const toDateRobust = (timestamp: any, docId: string, fieldName: string, fallbackDate: Date | null = null): Date | null => {
    if (!timestamp) return fallbackDate;
    if (timestamp.toDate) return timestamp.toDate();
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;
    logger.warn(`toDateRobust: Formato data non valido per ${docId}, campo '${fieldName}'. Valore: ${JSON.stringify(timestamp)}`);
    return fallbackDate;
};

const sendRapportinoNotifications = async (
    creatorId: string,
    participantIds: string[] | undefined,
    rapportinoDate: Date | null,
    creatorName?: string | null
) => {
    if (!participantIds || participantIds.length === 0) return;
    const otherParticipantIds = participantIds.filter(id => id !== creatorId);
    if (otherParticipantIds.length === 0) return;

    try {
        let finalCreatorName = creatorName;
        if (!finalCreatorName) {
            const creatorDoc = await db.collection("tecnici").doc(creatorId).get();
            finalCreatorName = creatorDoc.exists ? creatorDoc.data()?.nome : "un collega";
        }

        const usersSnapshot = await db.collection("tecnici").where(admin.firestore.FieldPath.documentId(), "in", otherParticipantIds).get();
        const tokens = usersSnapshot.docs.map(doc => doc.data().fcmToken).filter(Boolean);

        if (tokens.length > 0) {
            const dateString = rapportinoDate ? rapportinoDate.toLocaleDateString('it-IT') : 'N/D';
            const message = {
                notification: {
                    title: "Nuova Collaborazione",
                    body: `Sei stato aggiunto al rapportino di ${finalCreatorName} del ${dateString}.`
                },
                tokens: tokens,
            };
            await messaging.sendMulticast(message);
            logger.info(`Notifiche di collaborazione inviate con successo.`);
        }
    } catch (error) {
        logger.error("Errore in sendRapportinoNotifications:", error);
    }
};

// =============================================================================
// CRUD FUNCTIONS (FASE R.5 - ISO STRING DATES)
// =============================================================================

export const getAllRapportiniForSync = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    
    const { uid } = request.auth;
    const { lastSyncTimestamp } = request.data;

    try {
        let queryTecnico = db.collection("rapportini").where("tecnicoId", "==", uid);
        let queryPresenze = db.collection("rapportini").where("presenze", "array-contains", uid);

        if (lastSyncTimestamp && typeof lastSyncTimestamp === 'number' && lastSyncTimestamp > 0) {
            const syncDate = new Date(lastSyncTimestamp);
            queryTecnico = queryTecnico.where("updatedAt", ">", syncDate);
            queryPresenze = queryPresenze.where("updatedAt", ">", syncDate);
        }

        const [tecnicoSnap, presenzeSnap] = await Promise.all([queryTecnico.get(), queryPresenze.get()]);

        const allRapportiniMap = new Map();

        const processSnapshot = (snapshot: admin.firestore.QuerySnapshot) => {
            snapshot.docs.forEach(doc => {
                if (allRapportiniMap.has(doc.id)) return;

                const docData = doc.data();

                const finalData = toDateRobust(docData.data, doc.id, 'data') || 
                                  toDateRobust(docData.dataInizio, doc.id, 'dataInizio') ||
                                  toDateRobust(docData.createdAt, doc.id, 'createdAt', new Date());

                if (!finalData) {
                    logger.warn(`Documento ${doc.id} scartato: nessuna data valida trovata.`);
                    return; 
                }

                const cleanRapportino = {
                    id: doc.id,
                    data: finalData.toISOString(), // *** THE FIX ***
                    dataFine: toDateRobust(docData.dataFine, doc.id, 'dataFine')?.toISOString() || null,
                    tecnicoId: docData.tecnicoId || null,
                    presenze: docData.presenze || [],
                    tipoGiornataId: docData.tipoGiornataId || null,
                    includeTrasferta: !!docData.includeTrasferta,
                    lavoroEseguito: docData.lavoroEseguito || '',
                    dettaglioOreTecnici: docData.dettaglioOreTecnici || [],
                    trasfertaId: docData.trasfertaId || null,
                    naveId: docData.naveId || null,
                    luogoId: docData.luogoId || null,
                    veicoloId: docData.veicoloId || null,
                    descrizioneBreve: docData.descrizioneBreve || '',
                    materialiImpiegati: docData.materialiImpiegati || '',
                    ordineLavoro: docData.ordineLavoro || '',
                    firmaFirmatarioNome: docData.firmaFirmatarioNome || '',
                    firmaFirmatarioSocieta: docData.firmaFirmatarioSocieta || '',
                    firmaVettoriale: docData.firmaVettoriale || null,
                    createdAt: toDateRobust(docData.createdAt, doc.id, 'createdAt', finalData)?.toISOString() || finalData.toISOString(),
                    createdBy: docData.createdBy || null,
                    updatedAt: toDateRobust(docData.updatedAt, doc.id, 'updatedAt', finalData)?.toISOString() || finalData.toISOString(),
                    updatedBy: docData.updatedBy || null,
                    isLocked: !!docData.isLocked,
                    version: docData.version || 1,
                    isDeleted: !!docData.isDeleted,
                };

                allRapportiniMap.set(doc.id, cleanRapportino);
            });
        };

        processSnapshot(tecnicoSnap);
        processSnapshot(presenzeSnap);
        
        const rapportini = Array.from(allRapportiniMap.values());
        logger.info(`FASE R.5 -> Sync per ${uid}: ${rapportini.length} rapportini puliti (con date ISO) pronti per l'invio.`);
        return { data: rapportini };

    } catch (error) {
        logger.error(`Errore critico in getAllRapportiniForSync per l'utente ${uid}:`, error);
        throw new HttpsError("internal", "Errore durante il recupero dei dati di sincronizzazione.");
    }
});

export const createRapportino = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");

    const rawData = request.data;
    const creatorId = request.auth.uid;
    logger.info(`FASE R.5 -> createRapportino chiamato da ${creatorId} con:`, { rawData });

    try {
        const rapportinoData = toDateRobust(rawData.data, 'new_doc', 'data', new Date());
        if (!rapportinoData) {
            throw new HttpsError("invalid-argument", "Il campo 'data' fornito non è valido.");
        }

        const payload: any = {
            ...rawData,
            data: rapportinoData, 
            tecnicoId: rawData.tecnicoId || creatorId, 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: creatorId,
            updatedBy: creatorId,
            isDeleted: false,
            version: 1,
        };
        delete payload.dataInizio; 
        delete payload.dettaglioOre;

        const docRef = await db.collection("rapportini").add(payload);
        logger.info(`FASE R.5 -> Rapportino creato con ID: ${docRef.id}`);

        await sendRapportinoNotifications(creatorId, payload.presenze, rapportinoData, request.auth.token.name);

        return { status: "success", id: docRef.id };

    } catch (error) {
        logger.error("Errore creazione rapportino:", error, { data: rawData });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Errore interno nel salvataggio del rapportino.");
    }
});

export const updateRapportino = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    
    const { id, ...data } = request.data;
    if (!id) throw new HttpsError("invalid-argument", "ID rapportino non fornito.");

    logger.info(`FASE R.5 -> updateRapportino chiamato per ID: ${id}`, { data });
    const rapportinoRef = db.collection("rapportini").doc(id);

    try {
        const payload: any = {
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid
        };

        if (data.data) {
            const newDate = toDateRobust(data.data, id, 'data');
            if (newDate) payload.data = newDate;
        }
        delete payload.dataInizio;
        delete payload.dettaglioOre;

        await rapportinoRef.update(payload);
        logger.info(`FASE R.5 -> Rapportino ${id} aggiornato con successo.`);

        if (data.presenze) {
            const docSnap = await rapportinoRef.get();
            const originalData = docSnap.data();
            if(originalData) {
                 await sendRapportinoNotifications(
                    originalData.createdBy,
                    data.presenze,
                    toDateRobust(payload.data || originalData.data, id, 'data')
                );
            }
        }

        return { status: "success", success: true };

    } catch (error) {
        logger.error(`Errore aggiornamento rapportino ${id}:`, error, { data });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Errore interno durante l'aggiornamento.");
    }
});

export const deleteRapportino = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Utente non autenticato.");
    const claims = request.auth.token;
    if (claims.role !== 'admin' && claims.role !== 'superadmin') {
         throw new HttpsError("permission-denied", "Solo gli amministratori possono eliminare.");
    }
    const { rapportinoId } = request.data;
    if (!rapportinoId) throw new HttpsError("invalid-argument", "ID rapportino non fornito.");
    try {
        await db.collection('rapportini').doc(rapportinoId).update({ 
            isDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: request.auth.uid
        });
        logger.info(`FASE R.5 -> Rapportino ${rapportinoId} marcato come eliminato da ${request.auth.uid}`);
        return { success: true };
    } catch (error) {
        logger.error(`Errore soft-delete ${rapportinoId}:`, error);
        throw new HttpsError("internal", "Errore interno durante l'eliminazione.");
    }
});
