
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

interface ManageUsersPayload {
    action: "promoteToAdmin" | "list" | "createUser" | "setRole" | "deleteUser";
    payload?: {
        uid?: string;
        email?: string;
        nome?: string;
        cognome?: string;
        role?: string;
    };
}

export const manageUsers = onCall({ region: "europe-west1" }, async (request) => {
    const data = request.data as ManageUsersPayload;
    const action = data?.action;
    const payload = data?.payload;
    const callerUid = request.auth?.uid;
    const usersCollection = db.collection("utenti_master");
    const adminsCollection = db.collection("amministratori");

    if (!action) {
        throw new HttpsError("invalid-argument", "Azione non specificata.");
    }

    if (action === "promoteToAdmin") {
        if (!callerUid) {
            throw new HttpsError("unauthenticated", "Devi essere autenticato per auto-promuoverti.");
        }

        const listUsersResult = await auth.listUsers(1000);
        const existingAdmin = listUsersResult.users.find((u) => u.customClaims?.role === "admin");
        if (existingAdmin && existingAdmin.uid !== callerUid) {
            throw new HttpsError("permission-denied", "Un amministratore esiste già.");
        }

        await auth.setCustomUserClaims(callerUid, { role: "admin" });
        return { status: "success", message: "Complimenti! L'utente è ora il primo amministratore." };
    }

    const isCallerAdmin = request.auth?.token?.role === "admin";
    if (!isCallerAdmin) {
        throw new HttpsError("permission-denied", "Accesso negato. Operazione riservata agli amministratori.");
    }

    switch (action) {
        case "list": {
            try {
                const listUsersResult = await auth.listUsers(1000);
                let users = listUsersResult.users.map((userRecord) => ({
                    uid: userRecord.uid,
                    email: userRecord.email,
                    role: userRecord.customClaims?.role || "utente",
                }));

                const requestedRole = payload?.role;
                if (requestedRole) {
                    if (requestedRole.startsWith("!")) {
                        const roleToExclude = requestedRole.substring(1);
                        users = users.filter((u) => u.role !== roleToExclude);
                    } else {
                        users = users.filter((u) => u.role === requestedRole);
                    }
                }

                return { users };
            } catch (error: any) {
                logger.error("Errore nel listare gli utenti", error);
                throw new HttpsError("internal", "Errore durante il recupero degli utenti.");
            }
        }

        case "createUser": {
            if (!payload?.email || !payload?.nome) {
                throw new HttpsError("invalid-argument", "Email e nome sono richiesti per creare un utente.");
            }
            try {
                const userRecord = await auth.createUser({
                    email: payload.email,
                    displayName: `${payload.nome} ${payload.cognome || ""}`.trim(),
                });

                await auth.setCustomUserClaims(userRecord.uid, { role: "tecnico" });
                await usersCollection.doc(userRecord.uid).set({
                    nome: payload.nome,
                    cognome: payload.cognome || "",
                    email: payload.email,
                });

                return {
                    status: "success",
                    message: `Utente ${payload.email} creato con successo.`,
                    user: {
                        uid: userRecord.uid,
                        email: userRecord.email,
                        role: "tecnico",
                    },
                };
            } catch (error: any) {
                logger.error("Errore nella creazione dell'utente", error);
                if (error?.code === "auth/email-already-exists") {
                    throw new HttpsError("already-exists", `L'utente con email ${payload.email} esiste già.`);
                }
                throw new HttpsError("internal", "Errore sconosciuto durante la creazione dell'utente.");
            }
        }

        case "setRole": {
            const targetUid = payload?.uid;
            const role = payload?.role;
            if (!targetUid || !role) {
                throw new HttpsError("invalid-argument", "UID utente e nuovo ruolo sono richiesti.");
            }

            try {
                await auth.setCustomUserClaims(targetUid, { role });
                if (role === "admin") {
                    const sourceDoc = await usersCollection.doc(targetUid).get();
                    const sourceData = sourceDoc.exists ? sourceDoc.data() : { uid: targetUid };
                    await adminsCollection.doc(targetUid).set(sourceData || {});
                    await usersCollection.doc(targetUid).delete().catch(() => undefined);
                } else {
                    const sourceDoc = await adminsCollection.doc(targetUid).get();
                    const sourceData = sourceDoc.exists ? sourceDoc.data() : { uid: targetUid };
                    await usersCollection.doc(targetUid).set(sourceData || {});
                    await adminsCollection.doc(targetUid).delete().catch(() => undefined);
                }
                return { status: "success", message: "Ruolo aggiornato con successo." };
            } catch (error: any) {
                logger.error("Errore nell'impostare il ruolo", error);
                throw new HttpsError("internal", "Errore durante l'aggiornamento del ruolo.");
            }
        }

        case "deleteUser": {
            const targetUid = payload?.uid;
            if (!targetUid) {
                throw new HttpsError("invalid-argument", "L'UID dell'utente è richiesto per l'eliminazione.");
            }
            try {
                await auth.deleteUser(targetUid);
                await usersCollection.doc(targetUid).delete().catch(() => undefined);
                await adminsCollection.doc(targetUid).delete().catch(() => undefined);
                return { status: "success", message: "Utente eliminato con successo." };
            } catch (error: any) {
                logger.error("Errore nell'eliminazione dell'utente", error);
                throw new HttpsError("internal", "Impossibile eliminare l'utente.");
            }
        }

        default:
            throw new HttpsError("invalid-argument", `L'azione richiesta '${action}' non è valida.`);
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
        const batchId = db.collection("notifications").doc().id;
        let targetName = "";

        if (targetType === "all") {
            targetName = "Tutti i tecnici abilitati";
        } else if (targetType === "category") {
            const categoryDoc = await db.collection("categorie").doc(targetId).get();
            targetName = categoryDoc.exists ? String(categoryDoc.data()?.nome || targetId) : targetId;
        } else {
            const tecnicoDoc = await db.collection("tecnici").doc(targetId).get();
            const tecnicoData = tecnicoDoc.exists ? tecnicoDoc.data() : null;
            targetName = tecnicoData ? `${tecnicoData.cognome || ""} ${tecnicoData.nome || ""}`.trim() || targetId : targetId;
        }

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

        const notificationsBatch = db.batch();
        const notificationsCollection = db.collection("notifications");
        uids.forEach((uid) => {
            const notificationRef = notificationsCollection.doc();
            notificationsBatch.set(notificationRef, {
                batchId,
                title,
                message,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                recipientId: uid,
                status: "unread",
                readAt: null,
                readBy: null,
                target: {
                    type: targetType,
                    id: targetId || "all",
                    name: targetName,
                },
            });
        });
        await notificationsBatch.commit();

        // 4. Send FCM Message
        const tokenPromises = uids.map(uid => db.collection(`tecnici/${uid}/tokens`).get());
        const tokenSnapshots = await Promise.all(tokenPromises);
        const allTokens = tokenSnapshots.flatMap(snap => snap.docs.map(doc => doc.id)).filter(Boolean);

        let fcmMessageId = "no-fcm";
        if (allTokens.length > 0) {
            logger.info(`Invio di notifiche FCM a ${allTokens.length} token.`);
            const multicastMessage: admin.messaging.MulticastMessage = {
                tokens: allTokens,
                notification: { title, body: message },
                webpush: { notification: { icon: "https://risomobile.it/images/logo.png" } },
            };
            const response = await messaging.sendEachForMulticast(multicastMessage);
            fcmMessageId = `success:${response.successCount}/failure:${response.failureCount}`;
        } else {
            logger.info("Nessun token FCM trovato per i destinatari.");
        }

        // 5. Create Sent Notification Document
        const sentNotificationRef = db.collection("notificheInviate").doc();
        await sentNotificationRef.set({
            batchId,
            title,
            message,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            target: { type: targetType, id: targetId || "all", name: targetName },
            recipientsCount: uids.length,
            fcmMessageId: fcmMessageId,
        });
        logger.info("Documento 'notificheInviate' creato con successo:", { id: sentNotificationRef.id });
        
        return { success: true, message: `Operazione completata. Notifiche inviate a ${uids.length} tecnici.`, batchId };

    } catch (error: any) {
        logger.error("Errore imprevisto durante l'invio delle notifiche:", {
            errorMessage: error.message,
            errorStack: error.stack,
            requestData: request.data,
        });
        throw new HttpsError("internal", error.message || "Si è verificato un errore interno.");
    }
});
