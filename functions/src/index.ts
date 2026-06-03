
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();
const messaging = admin.messaging();

// Funzione per abilitare/disabilitare l'accesso di un tecnico
export const manageAccess = onCall(async (request) => {
    // 1. Controllo di autenticazione: solo gli utenti autenticati possono chiamare questa funzione
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }

    const { uid, abilitato } = request.data;

    // 2. Validazione dell'input
    if (typeof uid !== 'string' || uid.length === 0) {
        throw new HttpsError("invalid-argument", "L'UID del tecnico non è valido.");
    }
    if (typeof abilitato !== 'boolean') {
        throw new HttpsError("invalid-argument", "Lo stato 'abilitato' deve essere un booleano.");
    }

    logger.info(`Inizio processo per UID: ${uid}, nuovo stato abilitato: ${abilitato}`);

    try {
        // 3. Aggiorna l'utente in Firebase Authentication
        //    La proprietà `disabled` in Firebase Auth è l'inverso di `abilitato`
        await auth.updateUser(uid, { disabled: !abilitato });
        logger.info(`Utente in Auth aggiornato con successo per UID: ${uid}. Stato disabled: ${!abilitato}`);

        // 4. Aggiorna il documento in Firestore
        await db.collection("tecnici").doc(uid).update({ abilitato: abilitato });
        logger.info(`Documento in Firestore aggiornato con successo per UID: ${uid}.`);

        return { success: true, message: `Accesso per l'utente ${uid} aggiornato con successo.` };

    } catch (error: any) {
        logger.error(`Errore durante l'aggiornamento dell'accesso per UID: ${uid}`, {
            errorMessage: error.message,
            errorStack: error.stack,
        });

        // Se l'errore è di tipo "not-found", significa che l'utente non esiste in Firebase Auth
        if (error.code === 'auth/user-not-found') {
            throw new HttpsError("not-found", `L'utente con UID ${uid} non è stato trovato in Firebase Authentication.`);
        }

        // Per tutti gli altri errori, restituisci un errore interno generico
        throw new HttpsError("internal", "Si è verificato un errore interno durante l'aggiornamento dell'accesso.");
    }
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
        // 3. Get Recipient UIDs
        let query: admin.firestore.Query;
        switch (targetType) {
            case "all":
                query = db.collection("tecnici").where("abilitato", "==", true);
                break;
            case "category":
                query = db.collection("tecnici").where("abilitato", "==", true).where("categoria", "==", targetId);
                break;
            case "user":
                const userDoc = await db.collection("tecnici").doc(targetId).get();
                query = db.collection("tecnici").where(admin.firestore.FieldPath.documentId(), "==", (userDoc.exists && userDoc.data()?.abilitato === true) ? targetId : "INVALID_UID");
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
