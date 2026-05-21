
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

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
                // Firestore does not allow querying by document ID and another field directly in this manner.
                // We query by ID first, then check for 'abilitato' status.
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
        
        // This part from the old function was WRONG. It created a 'notifications' doc for each user.
        // The new logic uses a single 'notificheInviate' doc and tracks reads there.
        // I am explicitly removing the old batch write to the 'notifications' collection.

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
