
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { auth, db, messaging } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Helper function to check for admin privileges
const checkAdmin = async (uid: string) => {
    const user = await auth.getUser(uid);
    const customClaims = (user.customClaims || {});
    if (customClaims.admin !== true) {
        logger.warn(`User ${uid} attempted an admin action without privileges.`);
        throw new HttpsError("permission-denied", "This operation is restricted to administrators.");
    }
};


// ===============================================================================================
// NUOVA FUNZIONE PER INVIO NOTIFICHE PUSH (LOGICA CORRETTA)
// ===============================================================================================

export const master_inviaNotifichePush = onCall({ region: "europe-west6", cors: true }, async (request) => {
    logger.info("FORCE DEPLOY LOG V4"); // LOG INUTILE PER FORZARE IL DEPLOY
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    await checkAdmin(request.auth.uid);

    const { userIds, title, message } = request.data;

    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !message) {
        throw new HttpsError("invalid-argument", "Payload must include userIds (array), title, and message.");
    }

    logger.info(`[master_inviaNotifichePush] Ricevuta richiesta di invio a ${userIds.length} utenti da parte di ${request.auth.uid}`);

    const tokens: string[] = [];
    const tokenPromises = userIds.map(uid => db.collection('tecnici').doc(uid).get());
    const tokenSnapshots = await Promise.all(tokenPromises);

    tokenSnapshots.forEach(snap => {
        if (snap.exists && snap.data()?.fcmToken) {
            tokens.push(snap.data()!.fcmToken);
        }
    });

    if (tokens.length === 0) {
        logger.warn("[master_inviaNotifichePush] Nessun token FCM valido trovato per gli utenti specificati.");
        return { success: true, successCount: 0, failureCount: 0, message: "Nessun token di destinazione trovato." };
    }
    
    const payload = {
        notification: {
            title,
            body: message
        },
        webpush: {
            fcmOptions: {
                link: 'https://rapportini-b8328.web.app/rapportini' // URL di default se non specificato
            }
        }
    };

    try {
        // 1. PRIMA INVIO LA NOTIFICA PUSH
        const response = await messaging.sendToDevice(tokens, payload);
        const successCount = response.successCount;
        const failureCount = response.failureCount;
        logger.info(`[master_inviaNotifichePush] Invio FCM completato. Successi: ${successCount}, Fallimenti: ${failureCount}.`);

        if (failureCount > 0) {
            response.results.forEach((result, index) => {
                if (result.error) {
                    logger.error(`Fallimento invio al token ${tokens[index]}:`, result.error);
                }
            });
        }

        // 2. SOLO SE L'INVIO HA AVUTO SUCCESSO (ANCHE PARZIALE), SCRIVO LA CRONOLOGIA
        if (successCount > 0) {
            const batch = db.batch();
            const notificheCollection = db.collection('notifiche');
            userIds.forEach(uid => {
                const newNotificaRef = notificheCollection.doc(); // Crea un nuovo documento con ID automatico
                batch.set(newNotificaRef, {
                    userId: uid,
                    title,
                    message,
                    isRead: false,
                    createdAt: FieldValue.serverTimestamp(),
                    type: 'info' // O un tipo più specifico se necessario
                });
            });
            await batch.commit();
            logger.info(`[master_inviaNotifichePush] Cronologia notifiche scritta su Firestore per ${userIds.length} utenti.`);
        }

        return { success: true, successCount, failureCount };

    } catch (error) {
        logger.error("[master_inviaNotifichePush] Errore critico durante l'invio dei messaggi FCM:", error);
        throw new HttpsError("internal", "Errore interno durante l'invio delle notifiche push.");
    }
});


// ===============================================================================================
// FUNZIONI ESISTENTI (MODIFICATE/INTEGRATE)
// ===============================================================================================

/**
 * Recupera l'elenco dei soli utenti del pannello (non i tecnici).
 * Filtra gli utenti in base all'esistenza del custom claim 'admin'.
 * Richiede privilegi di amministratore.
 */
export const admin_getAllUsers = onCall({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);

    try {
        const listUsersResult = await auth.listUsers();
        const users = listUsersResult.users
            .filter(user => {
                const customClaims = (user.customClaims || {}) as { admin?: any };
                return customClaims.admin !== undefined;
            })
            .map(user => {
                const customClaims = (user.customClaims || {}) as { admin?: boolean };
                return {
                    id: user.uid,
                    nome: user.displayName || 'Nome non disponibile',
                    email: user.email || 'Email non disponibile',
                    ruolo: customClaims.admin === true ? 'admin' : 'user',
                };
            });

        logger.info(`[admin_getAllUsers] Found ${users.length} panel users for admin ${request.auth.uid}.`);
        return users;

    } catch (e: any) {
        logger.error(`[admin_getAllUsers] Critical error while fetching users:`, e);
        throw new HttpsError("internal", e.message || "An internal server error occurred while fetching the user list.");
    }
});


export const amministrazione_gestisciUtenti = onCall({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);
    
    const { action, ...data } = request.data;
    logger.info(`[amministrazione_gestisciUtenti] Received action: '${action}'`, { data });

    try {
        switch (action) {
            case 'createUser': {
                const { email, nome, password } = data;
                if (!email || !nome || !password) {
                    throw new HttpsError("invalid-argument", "Email, nome, and password are required for user creation.");
                }
                const newUserRecord = await auth.createUser({ email, password, displayName: nome });
                await auth.setCustomUserClaims(newUserRecord.uid, { admin: false });
                logger.info(`User ${newUserRecord.uid} created successfully by ${request.auth.uid}.`);
                return { success: true, id: newUserRecord.uid };
            }

            case 'updateUser': {
                const { uid, nome: newName } = data;
                if (!uid || !newName) {
                    throw new HttpsError("invalid-argument", "User UID and a new name (nome) are required for update.");
                }
                await auth.updateUser(uid, { displayName: newName });
                logger.info(`User ${uid} was updated by ${request.auth.uid}.`);
                return { success: true };
            }

            case 'deleteUser': {
                const { uid: deleteUid } = data;
                if (!deleteUid) {
                    throw new HttpsError("invalid-argument", "User UID is required for deletion.");
                }
                if (deleteUid === request.auth.uid) {
                    throw new HttpsError("permission-denied", "Administrators cannot delete their own account.");
                }
                await auth.deleteUser(deleteUid);
                logger.info(`User ${deleteUid} was deleted by ${request.auth.uid}.`);
                return { success: true };
            }

            case 'toggleRole': {
                const { uid: roleUid, role } = data;
                if (!roleUid || (role !== 'admin' && role !== 'user')) {
                    throw new HttpsError("invalid-argument", "User UID and a valid role ('admin' or 'user') are required.");
                }
                if (roleUid === request.auth.uid) {
                    throw new HttpsError("permission-denied", "Administrators cannot change their own role.");
                }
                await auth.setCustomUserClaims(roleUid, { admin: role === 'admin' });
                logger.info(`Role for user ${roleUid} was changed to '${role}' by ${request.auth.uid}.`);
                return { success: true };
            }

            default:
                logger.warn(`[amministrazione_gestisciUtenti] Unsupported action called: '${action}'`);
                throw new HttpsError("invalid-argument", `The action '${action}' is not supported.`);
        }
    } catch (e: any) {
        logger.error(`[amministrazione_gestisciUtenti] Critical error on action '${action}':`, e);
        throw new HttpsError("internal", e.message || `An internal error occurred while performing the action: ${action}.`);
    }
});


export const master_gestisciTecnico = onCall({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    await checkAdmin(request.auth.uid);
    
    const operation = request.data.operation ? String(request.data.operation).trim() : null;
    const data = request.data.payload || request.data.data;

    if (!operation || !data) {
        throw new HttpsError("invalid-argument", "Incomplete payload.");
    }

    logger.info(`[master_gestisciTecnico] Executing: '${operation}' with payload:`, data);

    const { id, password, ...restData } = data;

    try {
        if (operation === 'add') {
            if (!restData.email || !password || !restData.nome || !restData.cognome) {
                throw new HttpsError("invalid-argument", "Email, password, nome, and cognome are required for creation.");
            }
            const newUserRecord = await auth.createUser({
                email: restData.email,
                password: password,
                displayName: `${restData.nome} ${restData.cognome}`,
                disabled: false,
            });

            const firestoreData = { 
                ...restData,
                id: newUserRecord.uid, 
                attivo: true, 
                appAccess: true, 
                accessoApp: true, 
                createdAt: FieldValue.serverTimestamp(), 
                updatedAt: FieldValue.serverTimestamp()
            };
            await db.collection('tecnici').doc(newUserRecord.uid).set(firestoreData);
            logger.info(`Successfully created technician ${newUserRecord.uid}`);
            return { success: true, id: newUserRecord.uid };

        } else if (operation === 'update') {
            if (!id) throw new HttpsError("invalid-argument", "'id' is required for update.");
            
            await db.collection('tecnici').doc(id).update({ ...restData, updatedAt: FieldValue.serverTimestamp() });
            if (restData.email) {
                await auth.updateUser(id, { email: restData.email });
            }
            logger.info(`Successfully updated technician ${id}`);
            return { success: true, id: id };

        } else if (operation === 'toggle-attivo') {
            if (!id || typeof restData.attivo !== 'boolean') {
                throw new HttpsError("invalid-argument", "'id' and 'attivo' (boolean) are required.");
            }
            await db.collection('tecnici').doc(id).update({ attivo: restData.attivo, updatedAt: FieldValue.serverTimestamp() });
            await auth.updateUser(id, { disabled: !restData.attivo });
            // If technician is deactivated, also block app access
            if (restData.attivo === false) {
                await db.collection('tecnici').doc(id).update({ appAccess: false, accessoApp: false });
            }
            return { success: true };

        } else if (operation === 'toggle-access') {
            if (!id || typeof restData.appAccess !== 'boolean') {
                throw new HttpsError("invalid-argument", "'id' and 'appAccess' (boolean) are required.");
            }
            const tecnicoDoc = await db.collection('tecnici').doc(id).get();
            if (!tecnicoDoc.exists || tecnicoDoc.data()?.attivo === false) {
                throw new HttpsError("failed-precondition", "Cannot change access for an inactive technician.");
            }
            await db.collection('tecnici').doc(id).update({ appAccess: restData.appAccess, accessoApp: restData.appAccess, updatedAt: FieldValue.serverTimestamp() });
            await auth.updateUser(id, { disabled: !restData.appAccess });
            return { success: true };

        } else {
            logger.error(`FATAL: Operation '${operation}' did not match any IF/ELSE branch.`);
            throw new HttpsError("invalid-argument", `Operation '${operation}' is not supported.`);
        }
    } catch (e: any) {
        logger.error(`Error during '${operation}' execution:`, e);
        throw new HttpsError("internal", e.message);
    }
});


export const deleteNotificationBatch = onCall({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);

    const collectionRef = db.collection('notifiche');
    const batchSize = 499;
    logger.info(`[deleteNotificationBatch] Starting batch deletion for 'notifiche', requested by admin ${request.auth.uid}.`);

    try {
        let deletedCount = 0;
        let snapshot;
        do {
            snapshot = await collectionRef.limit(batchSize).get();
            if (snapshot.empty) break;

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            deletedCount += snapshot.size;
            logger.info(`[deleteNotificationBatch] Deleted a batch of ${snapshot.size} notifications.`);

        } while (snapshot.size > 0);

        logger.info(`[deleteNotificationBatch] Deletion completed. Total deleted: ${deletedCount}.`);
        return { success: true, deletedCount };

    } catch (e: any) {
        logger.error(`[deleteNotificationBatch] Critical error during batch deletion:`, e);
        throw new HttpsError("internal", e.message || "An internal server error occurred during notification deletion.");
    }
});


// Ignored/deprecated functions
export const master_gestisciAnagrafica = onCall({ region: "europe-west6" }, async () => {
    throw new HttpsError("unimplemented", "Function not implemented.");
});
export const master_resetPasswordTecnico = onCall({ region: "europe-west6" }, async () => {
    throw new HttpsError("unimplemented", "Function not implemented.");
});
