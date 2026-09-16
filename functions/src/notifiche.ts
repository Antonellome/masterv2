import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// NOTA: 'db' non viene più inizializzato qui per evitare errori di "app non inizializzata" durante il deploy.
// Verrà inizializzato all'interno di ogni funzione.

// 1. Funzione per recuperare le notifiche
export const getNotifiche = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        const db = admin.firestore(); // Inizializzazione LATE (pigra)
        if (!request.auth) {
            throw new functions.HttpsError("unauthenticated", "Autenticazione richiesta.");
        }
        const tecnicoId = request.auth.token.tecnicoId;
        if (!tecnicoId) {
            throw new functions.HttpsError("failed-precondition", "Token utente incompleto.");
        }
        const snapshot = await db.collection("notifiche").where("tecnicoId", "==", tecnicoId).orderBy("createdAt", "desc").get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

// 2. Funzione per segnare le notifiche come lette
export const markNotificheAsRead = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        const db = admin.firestore(); // Inizializzazione LATE (pigra)
        if (!request.auth) {
            throw new functions.HttpsError("unauthenticated", "Autenticazione richiesta.");
        }
        const ids = request.data.notificationIds;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new functions.HttpsError("invalid-argument", "È richiesto un array di ID.");
        }
        const batch = db.batch();
        ids.forEach(id => {
            batch.update(db.collection("notifiche").doc(id), { isRead: true, letta: true });
        });
        await batch.commit();
        return { success: true };
    });

// 3. Funzione (Admin) per inviare una notifica
export const sendNotifica = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        const db = admin.firestore(); // Inizializzazione LATE (pigra)
        // Aggiungere un controllo per soli admin
        const { tecnicoId, title, body, link } = request.data;
        if (!tecnicoId || !title || !body) {
            throw new functions.HttpsError("invalid-argument", "Campi obbligatori mancanti.");
        }
        await db.collection("notifiche").add({
            tecnicoId, title, body, link: link || null, isRead: false, letta: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    });

// 4. Funzione (Admin) per cancellare le notifiche
export const deleteNotifiche = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        const db = admin.firestore(); // Inizializzazione LATE (pigra)
        // Aggiungere un controllo per soli admin
        const ids = request.data.notificationIds;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new functions.HttpsError("invalid-argument", "È richiesto un array di ID.");
        }
        const batch = db.batch();
        ids.forEach(id => {
            batch.delete(db.collection("notifiche").doc(id));
        });
        await batch.commit();
        return { success: true };
    });
