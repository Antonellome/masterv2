
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// ... (getNotifiche, markNotificheAsRead, sendNotifica, deleteNotifiche restano invariate) ...

// Recupera tutte le notifiche per il tecnico autenticato
export const getNotifiche = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "L'utente deve essere autenticato.");
    }
    const tecnicoId = context.auth.uid;
    try {
        const snapshot = await db.collection(`tecnici/${tecnicoId}/notifiche`).orderBy("dataCreazione", "desc").get();
        if (snapshot.empty) return { notifiche: [] };
        const notifiche = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), dataCreazione: doc.data().dataCreazione.toMillis() }));
        return { notifiche };
    } catch (error) {
        console.error("Errore recupero notifiche:", error);
        throw new functions.https.HttpsError("internal", "Errore interno nel recupero notifiche.");
    }
});

// Segna una o più notifiche come lette
export const markNotificheAsRead = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "L'utente deve essere autenticato.");
    }
    const tecnicoId = context.auth.uid;
    const { notificaIds } = data;
    if (!Array.isArray(notificaIds) || notificaIds.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "'notificaIds' deve essere un array non vuoto.");
    }
    try {
        const batch = db.batch();
        const collectionRef = db.collection(`tecnici/${tecnicoId}/notifiche`);
        notificaIds.forEach(id => {
            batch.update(collectionRef.doc(id), { letto: true, dataLettura: admin.firestore.FieldValue.serverTimestamp() });
        });
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Errore aggiornamento notifiche:", error);
        throw new functions.https.HttpsError("internal", "Errore interno nell'aggiornamento.");
    }
});

// Invia una notifica da parte di un admin
export const sendNotifica = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono inviare notifiche.");
    }
    const { target, titolo, corpo } = data;
    if (!target || !titolo || !corpo) {
        throw new functions.https.HttpsError("invalid-argument", "I campi 'target', 'titolo', e 'corpo' sono obbligatori.");
    }
    // ... (logica di invio invariata) ...
});

// Elimina una o più notifiche per il tecnico autenticato
export const deleteNotifiche = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "L'utente deve essere autenticato per eliminare le notifiche.");
    }
    // ... (logica di eliminazione invariata) ...
});


// NUOVA FUNZIONE PER ADMIN
export const deleteNotificationBatch = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.admin !== true) {
        throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono eseguire questa azione.");
    }

    const { logId, batchId } = data;
    if (!logId) {
        throw new functions.https.HttpsError("invalid-argument", "Il campo 'logId' è obbligatorio.");
    }

    try {
        const batch = db.batch();

        // 1. Elimina il log di invio
        const logRef = db.collection('notificheInviate').doc(logId);
        batch.delete(logRef);

        // 2. Se è presente un batchId, elimina tutte le notifiche associate
        if (batchId) {
            const notificheQuery = db.collection('notifiche').where('batchId', '==', batchId);
            const notificheSnapshot = await notificheQuery.get();
            notificheSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
        }

        await batch.commit();
        return { success: true };

    } catch (error) {
        console.error("Errore durante l'eliminazione del lotto di notifiche:", error);
        throw new functions.https.HttpsError("internal", "Si è verificato un errore interno durante l'eliminazione del lotto.");
    }
});
