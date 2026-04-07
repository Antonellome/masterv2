
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

// Inizializzazione Globale
try {
  admin.initializeApp();
} catch (e) {
  logger.info("L'app di admin è già inizializzata.");
}

const db = admin.firestore();
const auth = admin.auth();
const messaging = admin.messaging();

// ==========================================================================
// === TRIGGER 1: GESTIONE NOTIFICHE DALLA MASTER APP (ASINCRONO) ==========
// ==========================================================================

/**
 * Si attiva alla creazione di un documento in `notifiche_outbox`.
 * Gestisce l'invio di notifiche push (FCM) ai destinatari e archivia la notifica
 * nella collezione `notifiche` per la cronologia.
 */
export const processOutboxNotification = onDocumentCreated(
    { document: "notifiche_outbox/{docId}", region: "europe-west1" },
    async (event) => {
        const { docId } = event.params;
        const notificationPayload = event.data?.data();

        if (!notificationPayload) {
            logger.warn(`Payload vuoto per notifiche_outbox/${docId}. Uscita.`);
            return;
        }

        logger.info(`Inizio elaborazione notifica ${docId}.`);
        const outboxDocRef = event.data!.ref;

        try {
            // 1. Determina i destinatari e recupera i loro token FCM
            const tokens = await getTokensForNotification(notificationPayload);

            // 2. Prepara la notifica finale da salvare in `notifiche`
            const finalNotification = {
                ...notificationPayload,
                dataElaborazione: admin.firestore.FieldValue.serverTimestamp(),
                stato: "elaborata",
                readBy: {}, // Mappa per tracciare le letture
            };

            const finalNotificationRef = db.collection("notifiche").doc();

            // 3. Se ci sono token, invia le notifiche push
            if (tokens.length > 0) {
                const message: admin.messaging.MulticastMessage = {
                    notification: { 
                        title: notificationPayload.title,
                        body: notificationPayload.body
                    },
                    data: { 
                        notificationId: finalNotificationRef.id,
                        click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard per app Flutter/React Native
                    },
                    tokens,
                };
                const response = await messaging.sendEachForMulticast(message);
                logger.info(`FCM: ${response.successCount} notifiche inviate, ${response.failureCount} fallite.`);
            } else {
                logger.warn("Nessun token FCM valido trovato, nessuna notifica push inviata.");
            }

            // 4. Esegui il salvataggio e la pulizia in un batch atomico
            const batch = db.batch();
            batch.set(finalNotificationRef, finalNotification);
            batch.update(db.collection("system").doc("sync_manifest"), { 
                lastNotificationUpdate: admin.firestore.FieldValue.serverTimestamp() 
            });
            batch.delete(outboxDocRef);
            await batch.commit();

            logger.info(`Notifica ${docId} elaborata con successo. Nuovo ID: ${finalNotificationRef.id}`);
            return { status: "success" };

        } catch (error) {
            logger.error(`ERRORE CRITICO su notifica ${docId}:`, error);
            await moveDocToFailureCollection('notifiche_fallite', docId, notificationPayload, error);
            await outboxDocRef.delete(); // Rimuovi per evitare loop
            throw new HttpsError("internal", `Errore elaborazione notifica ${docId}.`);
        }
    }
);


// ==========================================================================
// === TRIGGER 2: GESTIONE RAPPORTINI DALLA APP TECNICI (ASINCRONO) =======
// ==========================================================================

/**
 * Si attiva alla creazione di un documento in `rapportini_outbox`.
 * Gestisce l'assegnazione di un numero progressivo ufficiale tramite una transazione
 * e archivia il rapportino nella collezione `rapportini`.
 */
export const processOutboxRapportino = onDocumentCreated(
    { document: "rapportini_outbox/{docId}", region: "europe-west1" },
    async (event) => {
        const { docId } = event.params;
        const rapportinoPayload = event.data?.data();

        if (!rapportinoPayload) {
            logger.warn(`Payload vuoto per rapportini_outbox/${docId}. Uscita.`);
            return;
        }
        
        logger.info(`Inizio elaborazione rapportino ${docId}.`);
        const outboxDocRef = event.data!.ref;

        try {
            const counterRef = db.collection("system").doc("counters");
            const finalRapportinoRef = db.collection("rapportini").doc(); // ID generato automaticamente

            // Transazione per garantire un numero progressivo atomico e univoco
            await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const currentYear = new Date().getFullYear();
                const counterField = `rapportino_${currentYear}`;
                
                let nextNumber = 1;
                if (counterDoc.exists && counterDoc.data()?.[counterField]) {
                    nextNumber = counterDoc.data()?.[counterField] + 1;
                }

                const numeroUfficiale = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;

                const finalRapportino = {
                    ...rapportinoPayload,
                    header: {
                        ...rapportinoPayload.header,
                        numero: numeroUfficiale, // Assegnazione del numero ufficiale!
                    },
                    dataElaborazione: admin.firestore.FieldValue.serverTimestamp(),
                    stato: 'archiviato',
                };

                transaction.set(finalRapportinoRef, finalRapportino);
                transaction.set(counterRef, { [counterField]: nextNumber }, { merge: true });
            });

            // Operazioni post-transazione (pulizia e notifica)
            await outboxDocRef.delete();
            await db.collection("system").doc("sync_manifest").update({
                lastRapportinoUpdate: admin.firestore.FieldValue.serverTimestamp()
            });

            logger.info(`Rapportino ${docId} elaborato. Numero ufficiale: ${finalRapportinoRef.id}.`);
            return { status: "success" };

        } catch (error) {
            logger.error(`ERRORE CRITICO su rapportino ${docId}:`, error);
            await moveDocToFailureCollection('rapportini_falliti', docId, rapportinoPayload, error);
            await outboxDocRef.delete(); // Rimuovi per evitare loop
            throw new HttpsError("internal", `Errore elaborazione rapportino ${docId}.`);
        }
    }
);


// ==========================================================================
// === FUNZIONI HELPER E ALTRE FUNZIONI (INVARIATE) =========================
// ==========================================================================

/** Funzione helper per recuperare i token FCM dei destinatari di una notifica. */
async function getTokensForNotification(notification: any): Promise<string[]> {
    let targetUids: string[] = [];
    const q = db.collection('tecnici').where('abilitato', '==', true);

    if (notification.isGlobal) {
        const allTecniciSnap = await q.get();
        targetUids = allTecniciSnap.docs.map(doc => doc.id);
    } else {
        const uidsById = notification.to_ids || [];
        let uidsByCategory: string[] = [];

        if (notification.to_category_ids && notification.to_category_ids.length > 0) {
            const catSnap = await q.where('categoriaId', 'in', notification.to_category_ids).get();
            uidsByCategory = catSnap.docs.map(doc => doc.id);
        }
        targetUids = [...new Set([...uidsById, ...uidsByCategory])];
    }
    
    if (targetUids.length === 0) return [];
    
    const tokens: string[] = [];
    for (const uid of targetUids) {
        const userDoc = await db.collection('tecnici').doc(uid).get();
        const fcmToken = userDoc.data()?.fcmToken;
        if (fcmToken) tokens.push(fcmToken);
    }
    return [...new Set(tokens)]; // Ritorna solo token unici
}

/** Funzione helper per spostare documenti falliti in una collezione di "dead-letter". */
async function moveDocToFailureCollection(collectionName: string, docId: string, payload: any, error: any) {
    await db.collection(collectionName).doc(docId).set({
        payload,
        errore: (error instanceof Error) ? error.message : "Errore sconosciuto",
        dataFallimento: admin.firestore.FieldValue.serverTimestamp(),
    });
}

// Qui rimangono le altre funzioni (manageAccess, getMasterData, setAdminClaim) che sono invariate.

export const manageAccess = onCall(/*...*/);
export const getMasterData = onCall(/*...*/);
export const setAdminClaim = onDocumentCreated(/*...*/);
