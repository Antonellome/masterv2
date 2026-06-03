
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();
const messaging = admin.messaging();

// Funzione robusta per gestire l'accesso dei tecnici (crea, abilita, disabilita)
export const manageTecnicoAccess = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }

    const { email, action } = request.data;

    if (typeof email !== 'string' || email.length === 0) {
        throw new HttpsError("invalid-argument", "L'email del tecnico non è valida.");
    }
    if (action !== 'enable' && action !== 'disable') {
        throw new HttpsError("invalid-argument", "L'azione specificata non è valida. Usare 'enable' o 'disable'.");
    }

    logger.info(`Inizio processo per email: ${email}, azione: ${action}`);

    let user;
    let uid = '';

    try {
        // Cerca l'utente tramite email
        user = await auth.getUserByEmail(email);
        uid = user.uid;
        logger.info(`Utente trovato con UID: ${uid}`);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            if (action === 'disable') {
                // Se l'utente non esiste e l'azione è disabilitare, non c'è nulla da fare.
                logger.warn(`L'utente con email ${email} non esiste, non è necessario disabilitarlo.`);
                // Potremmo voler comunque assicurarci che il db sia coerente
                const querySnapshot = await db.collection("tecnici").where("email", "==", email).get();
                if (!querySnapshot.empty) {
                    const docId = querySnapshot.docs[0].id;
                    await db.collection("tecnici").doc(docId).update({ appAccess: false });
                }
                return { success: true, message: "L'utente non esisteva, accesso già disabilitato." };
            }
            
            // Se l'utente non esiste e l'azione è abilitare, lo creiamo
            logger.info(`Utente con email ${email} non trovato. Inizio creazione.`);
            try {
                user = await auth.createUser({
                    email: email,
                    emailVerified: false, // L'utente dovrà verificare la sua email
                    disabled: false // Lo creiamo già abilitato
                });
                uid = user.uid;
                logger.info(`Nuovo utente creato con UID: ${uid}`);
            } catch (creationError: any) {
                logger.error(`Errore durante la creazione dell'utente ${email}:`, creationError);
                throw new HttpsError("internal", `Impossibile creare l'utente: ${creationError.message}`);
            }
        } else {
            // Per tutti gli altri errori in fase di lookup
            logger.error(`Errore durante la ricerca dell'utente ${email}:`, error);
            throw new HttpsError("internal", `Errore nella ricerca utente: ${error.message}`);
        }
    }

    // A questo punto, abbiamo un utente (esistente o appena creato)
    const newDisabledState = action === 'disable';

    if (user.disabled !== newDisabledState) {
        try {
            await auth.updateUser(uid, { disabled: newDisabledState });
            logger.info(`Stato di autenticazione per l'utente ${uid} aggiornato a disabled: ${newDisabledState}`);
        } catch (updateError: any) {
            logger.error(`Errore durante l'aggiornamento dell'autenticazione per l'utente ${uid}:`, updateError);
            throw new HttpsError("internal", `Impossibile aggiornare lo stato di autenticazione: ${updateError.message}`);
        }
    } else {
        logger.info(`L'utente ${uid} ha già lo stato di autenticazione desiderato (disabled: ${newDisabledState}).`);
    }

    // Infine, assicuriamo la coerenza del database Firestore
    try {
        const querySnapshot = await db.collection("tecnici").where("email", "==", email).get();
        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            // Aggiorniamo sia il campo appAccess che l'UID se mancava
            await db.collection("tecnici").doc(docId).update({ 
                appAccess: !newDisabledState,
                uid: uid 
            });
            logger.info(`Documento Firestore ${docId} aggiornato con appAccess: ${!newDisabledState} e UID: ${uid}.`);
        } else {
            logger.warn(`Nessun documento tecnico trovato in Firestore per l'email ${email}. L'autenticazione è stata aggiornata, ma il DB non è allineato.`);
        }
    } catch (dbError: any) {
        logger.error(`Errore durante l'aggiornamento di Firestore per l'email ${email}:`, dbError);
        throw new HttpsError("internal", `Impossibile aggiornare il database: ${dbError.message}`);
    }

    return { success: true, message: `Accesso per l'utente ${email} è stato ${action === 'enable' ? 'abilitato' : 'disabilitato'}.` };
});


interface SendNotificationData {
    targetType: "all" | "category" | "user";
    targetId: string;
    title: string;
    message: string;
}

export const sendNotification = onCall<SendNotificationData>(async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }

    // 2. Input Validation
    const { targetType, targetId, title, message } = request.data;
    logger.info("Inizio invio notifica con dati:", request.data);

    if (!title || !message) {
        throw new HttpsError("invalid-argument", "Il titolo e il messaggio sono obbligatori.");
    }
    if (!targetType || !["all", "category", "user"].includes(targetType)) {
        throw new HttpsError("invalid-argument", "Tipo di target non valido.");
    }
    if ((targetType === "category" || targetType === "user") && !targetId) {
        throw new HttpsError("invalid-argument", `L'ID del target è obbligatorio per il tipo '${targetType}'.`);
    }

    try {
        // 3. Get Recipient UIDs (Logica di filtro aggiornata)
        let query: admin.firestore.Query;
        switch (targetType) {
            case "all":
                query = db.collection("tecnici").where("appAccess", "==", true);
                break;
            case "category":
                query = db.collection("tecnici").where("appAccess", "==", true).where("categoriaId", "==", targetId);
                break;
            case "user":
                const userDoc = await db.collection("tecnici").doc(targetId).get();
                query = db.collection("tecnici").where(admin.firestore.FieldPath.documentId(), "==", (userDoc.exists && userDoc.data()?.appAccess === true) ? targetId : "INVALID_UID");
                break;
        }
        const recipientsSnapshot = await query.get();
        const uids = recipientsSnapshot.docs.map((doc) => doc.id);

        if (uids.length === 0) {
            logger.warn("Nessun tecnico trovato per la notifica.", { data: request.data });
            return { success: true, message: "Nessun tecnico corrispondente trovato." };
        }
        logger.info(`Trovati ${uids.length} tecnici destinatari.`);

        // 4. Send FCM Message
        const tokenPromises = uids.map(uid => db.collection(`tecnici/${uid}/tokens`).get());
        const tokenSnapshots = await Promise.all(tokenPromises);
        const allTokens = tokenSnapshots.flatMap(snap => snap.docs.map(doc => doc.id)).filter(Boolean);

        let fcmMessageId = "no-fcm";
        if (allTokens.length > 0) {
            logger.info(`Invio di notifiche FCM a ${allTokens.length} token.`);
            const payload = {
                notification: { title, body: message },
                webpush: { notification: { icon: "https://risomobile.it/images/logo.png" } },
            };
            const response = await messaging.sendToDevice(allTokens, payload, { priority: "high" });
            fcmMessageId = response.multicastId;
        } else {
            logger.info("Nessun token FCM trovato per i destinatari.");
        }

        // 5. Create Sent Notification Document
        const sentNotificationRef = db.collection("notificheInviate").doc();
        await sentNotificationRef.set({
            title,
            message,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            target: { type: targetType, id: targetId || "all" },
            recipientsCount: uids.length,
            fcmMessageId: fcmMessageId,
        });
        logger.info("Documento 'notificheInviate' creato con successo:", { id: sentNotificationRef.id });
        
        return { success: true, message: `Operazione completata. Notifiche inviate a ${uids.length} tecnici.` };

    } catch (error: any) {
        logger.error("Errore imprevisto durante l'invio delle notifiche:", {
            errorMessage: error.message,
            errorStack: error.stack,
            requestData: request.data,
        });
        throw new HttpsError("internal", error.message || "Si è verificato un errore interno.");
    }
});
