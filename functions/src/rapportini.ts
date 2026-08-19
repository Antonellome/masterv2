
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const db = admin.firestore();
const REGION = "europe-west1";

// Funzione di utilità per convertire in modo sicuro qualsiasi valore in un oggetto Date o null.
// Gestisce Timestamp di Firestore, stringhe di data, e oggetti corrotti.
const toDateSafe = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp && typeof timestamp.toDate === 'function') {
        // Formato Timestamp di Firestore standard
        return timestamp.toDate();
    }
    if (timestamp && typeof timestamp === 'object' && typeof timestamp._seconds === 'number') {
        // Formato oggetto comune quando i Timestamp vengono serializzati
        return new Date(timestamp._seconds * 1000);
    }
    // Prova a creare una data da una stringa o numero
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
        return d;
    }
    // Se tutto fallisce, logga l'anomalia e restituisci null
    logger.warn("toDateSafe: Rilevato formato data non valido o corrotto.", { value: timestamp });
    return null;
};

export const getAllRapportiniForSync = onCall({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    }

    try {
        const snapshot = await db.collection("rapportini").get();
        
        // 1. Mappa tutti i documenti includendo il loro ID.
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        
        // 2. Filtra solo i documenti non marcati come eliminati.
        const activeDocs = allDocs.filter(doc => doc.isDeleted !== true);

        // ===========================================================================================
        //  ** LOGICA DI TRASFORMAZIONE CORRETTA **
        //  Non scartiamo più nessun documento. Usiamo `map` per trasformare ogni documento.
        //  Ogni campo data viene sanitizzato. Se un campo data è corrotto, diventa `null`,
        //  ma l'oggetto rapportino viene comunque incluso nel risultato.
        // ===========================================================================================
        const rapportiniProcessati = activeDocs.map(doc => {
            return {
                ...doc,
                dataInizio: toDateSafe(doc.dataInizio),
                createdAt: toDateSafe(doc.createdAt),
                dataFine: toDateSafe(doc.dataFine),
                updatedAt: toDateSafe(doc.updatedAt),
            };
        });

        // Questo log ora dovrebbe sempre riportare "Documenti scartati: 0".
        logger.info(`Processo completato. Rapportini validi da inviare: ${rapportiniProcessati.length}. Documenti scartati: ${activeDocs.length - rapportiniProcessati.length}`);

        return { data: rapportiniProcessati };

    } catch (error) {
        logger.error("ERRORE CRITICO in getAllRapportiniForSync:", error);
        throw new HttpsError("internal", "Errore interno durante il recupero dei dati.");
    }
});

// --- Funzioni CRUD mantenute per integrità ---

export const createRapportino = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    const data = request.data;
    const dataWithTimestamps = { ...data, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: request.auth.uid, isDeleted: false };
    try {
        const docRef = await db.collection("rapportini").add(dataWithTimestamps);
        return { status: "success", id: docRef.id };
    } catch (error) {
        logger.error("Errore creazione rapportino:", error);
        throw new HttpsError("internal", "Errore interno.");
    }
});

export const updateRapportino = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    const { id, data } = request.data;
    if (!id || !data) throw new HttpsError("invalid-argument", "ID o dati mancanti.");
    const dataWithTimestamp = { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: request.auth.uid };
    try {
        await db.collection("rapportini").doc(id).update(dataWithTimestamp);
        return { status: "success" };
    } catch (error) {
        logger.error(`Errore aggiornamento ${id}:`, error);
        throw new HttpsError("internal", `Errore interno.`);
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
        return { success: true };
    } catch (error) {
        logger.error(`Errore soft-delete ${rapportinoId}:`, error);
        throw new HttpsError('internal', 'Errore interno durante l\'eliminazione.');
    }
});
