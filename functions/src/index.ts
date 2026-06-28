
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Helper function for paginated deletion with heavy logging
async function deleteQueryBatch(query: FirebaseFirestore.Query, batchSize: number): Promise<number> {
    logger.info(`[DIAGNOSTIC] deleteQueryBatch: Fetching up to ${batchSize} documents...`);
    const snapshot = await query.limit(batchSize).get();
    logger.info(`[DIAGNOSTIC] deleteQueryBatch: Fetched ${snapshot.size} documents.`);

    if (snapshot.size === 0) {
        logger.info("[DIAGNOSTIC] deleteQueryBatch: No documents to delete, returning 0.");
        return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc, index) => {
        if (index === 0) logger.info(`[DIAGNOSTIC] deleteQueryBatch: First doc to delete is ${doc.id}`);
        batch.delete(doc.ref);
    });
    
    logger.info(`[DIAGNOSTIC] deleteQueryBatch: Committing batch of ${snapshot.size} deletes...`);
    await batch.commit();
    logger.info("[DIAGNOSTIC] deleteQueryBatch: Batch committed successfully.");

    return snapshot.size;
}

export const sendNotification = onCall(
    { region: "europe-west1", cors: true, timeoutSeconds: 540 },
    async (request) => {
        // This function is unchanged from the last version, but included for completeness
        logger.info(">>> [sendNotification] Inizio esecuzione con dati:", request.data);

        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Autenticazione richiesta per inviare notifiche.");
        }

        const isCallerAdmin = request.auth.token.role === "admin";
        if (!isCallerAdmin) {
            throw new HttpsError("permission-denied", "Accesso negato. Solo gli amministratori possono inviare notifiche.");
        }

        const { title, body, targetType, targetId, targetName } = request.data;

        if (!title || !body || !targetType) {
            throw new HttpsError("invalid-argument", "Titolo, corpo e tipo di destinatario sono obbligatori.");
        }

        let targetUids: string[] = [];
        let targetDescription = "";

        try {
            if (targetType === "user" || targetType === "tecnico") {
                if (targetId) {
                    targetUids.push(targetId);
                    targetDescription = `Tecnico: ${targetName || targetId}`;
                }
            } else if (targetType === "categoria") {
                if (targetId) {
                    const tecniciSnapshot = await db.collection("tecnici").where("categoria", "==", targetId).get();
                    targetUids = tecniciSnapshot.docs.map(doc => doc.id);
                    targetDescription = `Categoria: ${targetName || targetId}`;
                }
            } else if (targetType === "tutti") {
                const tecniciSnapshot = await db.collection("tecnici").get();
                targetUids = tecniciSnapshot.docs.map(doc => doc.id);
                targetDescription = "Tutti i tecnici";
            }
        } catch (error: any) {
            logger.error("Errore nel determinare i destinatari:", error);
            throw new HttpsError("internal", `Impossibile recuperare i destinatari. Dettagli: ${error.message}`);
        }

        if (targetUids.length === 0) {
            logger.warn("Nessun destinatario valido trovato.");
            return { success: true, message: "Nessun destinatario valido trovato." };
        }

        const logRef = db.collection("notificheInviate").doc();
        const batchId = logRef.id;
        const now = admin.firestore.Timestamp.now();

        const logData = {
            title, body, sentAt: now, recipientsCount: targetUids.length, batchId,
            target: { type: targetType, description: targetDescription, ...(targetId && { id: targetId }) },
        };

        try {
            await logRef.set(logData);
            logger.info(`Log di notifica creato con batchId: ${batchId}`);

            const BATCH_LIMIT = 490;
            for (let i = 0; i < targetUids.length; i += BATCH_LIMIT) {
                const chunk = targetUids.slice(i, i + BATCH_LIMIT);
                const batch = db.batch();
                chunk.forEach(uid => {
                    const notificaRef = db.collection("notifiche").doc();
                    batch.set(notificaRef, { tecnicoId: uid, title, body, createdAt: now, isRead: false, batchId });
                });
                await batch.commit();
                logger.info(`Inviato batch di ${chunk.length} notifiche.`);
            }

            logger.info(`Tutte le notifiche per batchId ${batchId} sono state inviate con successo.`);
            return { success: true, message: `Notifica inviata a ${targetUids.length} destinatari.` };

        } catch (error: any) {
            logger.error(`Errore critico durante l'invio del batch ${batchId}:`, error);
            await logRef.update({ status: "failed", error: error.message });
            throw new HttpsError("internal", `Errore durante l'invio delle notifiche. ${error.message}`);
        }
    }
);

export const deleteNotificationBatch = onCall(
    { region: "europe-west1", cors: true, timeoutSeconds: 540 },
    async (request) => {
        logger.info("--- [DIAGNOSTIC] Inizio Esecuzione deleteNotificationBatch ---", { data: request.data });

        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
        }

        const { logId, batchId } = request.data;
        if (!logId) {
            throw new HttpsError("invalid-argument", "L'ID del log è obbligatorio.");
        }

        const mainStartTime = Date.now();

        try {
            logger.info("[DIAGNOSTIC] Step 1: Inizio eliminazione documento di log...", { logId });
            const logRef = db.collection("notificheInviate").doc(logId);
            await logRef.delete();
            logger.info("[DIAGNOSTIC] Step 2: Documento di log eliminato.", { logId, duration: Date.now() - mainStartTime });

            if (batchId) {
                logger.info("[DIAGNOSTIC] Step 3: Trovato batchId. Inizio eliminazione paginata.", { batchId });
                const query = db.collection("notifiche").where("batchId", "==", batchId);
                let totalDeleted = 0;
                let batchCount = 0;
                let continueDeleting = true;

                while (continueDeleting) {
                    batchCount++;
                    logger.info(`[DIAGNOSTIC] Step 4.${batchCount}: Tentativo di eliminare un nuovo batch.`);
                    const numDeleted = await deleteQueryBatch(query, 499);
                    
                    if (numDeleted > 0) {
                        totalDeleted += numDeleted;
                        logger.info(`[DIAGNOSTIC] Step 5.${batchCount}: Batch eliminato.`, { numDeleted, totalDeleted, duration: Date.now() - mainStartTime });
                    } else {
                        continueDeleting = false;
                    }
                }
                logger.info("[DIAGNOSTIC] Step 6: Eliminazione paginata completata.", { totalDeleted, duration: Date.now() - mainStartTime });
            } else {
                logger.info("[DIAGNOSTIC] Step 3: Nessun batchId trovato. Salto eliminazione paginata.");
            }

            logger.info("--- [DIAGNOSTIC] Esecuzione completata con successo ---", { duration: Date.now() - mainStartTime });
            return { success: true, message: "Notifica e riferimenti eliminati con successo." };

        } catch (error: any) {
            logger.error("--- [DIAGNOSTIC] ERRORE CRITICO --- ", { logId, batchId, message: error.message, stack: error.stack, duration: Date.now() - mainStartTime });
            throw new HttpsError("internal", `Si è verificato un errore durante l'eliminazione dei dati: ${error.message}`);
        }
    }
);
