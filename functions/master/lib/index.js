"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.master_resetPasswordTecnico = exports.master_gestisciAnagrafica = exports.deleteNotificationBatch = exports.master_gestisciTecnico = exports.amministrazione_gestisciUtenti = exports.admin_getAllUsers = exports.master_inviaNotifichePush = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firebase_admin_1 = require("./firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
// Helper function to check for admin privileges
const checkAdmin = async (uid) => {
    const user = await firebase_admin_1.auth.getUser(uid);
    const customClaims = (user.customClaims || {});
    if (customClaims.admin !== true) {
        logger.warn(`User ${uid} attempted an admin action without privileges.`);
        throw new https_1.HttpsError("permission-denied", "This operation is restricted to administrators.");
    }
};
// ===============================================================================================
// NUOVA FUNZIONE PER INVIO NOTIFICHE PUSH (LOGICA CORRETTA)
// ===============================================================================================
exports.master_inviaNotifichePush = (0, https_1.onCall)({ region: "europe-west6", cors: true }, async (request) => {
    logger.info("FORCE DEPLOY LOG V3"); // LOG INUTILE PER FORZARE IL DEPLOY
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    await checkAdmin(request.auth.uid);
    const { userIds, title, message } = request.data;
    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !message) {
        throw new https_1.HttpsError("invalid-argument", "Payload must include userIds (array), title, and message.");
    }
    logger.info(`[master_inviaNotifichePush] Ricevuta richiesta di invio a ${userIds.length} utenti da parte di ${request.auth.uid}`);
    const tokens = [];
    const tokenPromises = userIds.map(uid => firebase_admin_1.db.collection('fcmTokens').doc(uid).get());
    const tokenSnapshots = await Promise.all(tokenPromises);
    tokenSnapshots.forEach(snap => {
        var _a;
        if (snap.exists && ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.token)) {
            tokens.push(snap.data().token);
        }
    });
    if (tokens.length === 0) {
        logger.warn("[master_inviaNotifichePush] Nessun token FCM valido trovato per gli utenti specificati.");
        // Non scrivo in cronologia, semplicemente non ci sono target
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
        const response = await firebase_admin_1.messaging.sendToDevice(tokens, payload);
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
            const batch = firebase_admin_1.db.batch();
            const notificheCollection = firebase_admin_1.db.collection('notifiche');
            userIds.forEach(uid => {
                const newNotificaRef = notificheCollection.doc(); // Crea un nuovo documento con ID automatico
                batch.set(newNotificaRef, {
                    userId: uid,
                    title,
                    message,
                    isRead: false,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                    type: 'info' // O un tipo più specifico se necessario
                });
            });
            await batch.commit();
            logger.info(`[master_inviaNotifichePush] Cronologia notifiche scritta su Firestore per ${userIds.length} utenti.`);
        }
        return { success: true, successCount, failureCount };
    }
    catch (error) {
        logger.error("[master_inviaNotifichePush] Errore critico durante l'invio dei messaggi FCM:", error);
        throw new https_1.HttpsError("internal", "Errore interno durante l'invio delle notifiche push.");
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
exports.admin_getAllUsers = (0, https_1.onCall)({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);
    try {
        const listUsersResult = await firebase_admin_1.auth.listUsers();
        const users = listUsersResult.users
            .filter(user => {
            const customClaims = (user.customClaims || {});
            return customClaims.admin !== undefined;
        })
            .map(user => {
            const customClaims = (user.customClaims || {});
            return {
                id: user.uid,
                nome: user.displayName || 'Nome non disponibile',
                email: user.email || 'Email non disponibile',
                ruolo: customClaims.admin === true ? 'admin' : 'user',
            };
        });
        logger.info(`[admin_getAllUsers] Found ${users.length} panel users for admin ${request.auth.uid}.`);
        return users;
    }
    catch (e) {
        logger.error(`[admin_getAllUsers] Critical error while fetching users:`, e);
        throw new https_1.HttpsError("internal", e.message || "An internal server error occurred while fetching the user list.");
    }
});
exports.amministrazione_gestisciUtenti = (0, https_1.onCall)({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);
    const _a = request.data, { action } = _a, data = __rest(_a, ["action"]);
    logger.info(`[amministrazione_gestisciUtenti] Received action: '${action}'`, { data });
    try {
        switch (action) {
            case 'createUser': {
                const { email, nome, password } = data;
                if (!email || !nome || !password) {
                    throw new https_1.HttpsError("invalid-argument", "Email, nome, and password are required for user creation.");
                }
                const newUserRecord = await firebase_admin_1.auth.createUser({ email, password, displayName: nome });
                await firebase_admin_1.auth.setCustomUserClaims(newUserRecord.uid, { admin: false });
                logger.info(`User ${newUserRecord.uid} created successfully by ${request.auth.uid}.`);
                return { success: true, id: newUserRecord.uid };
            }
            case 'updateUser': {
                const { uid, nome: newName } = data;
                if (!uid || !newName) {
                    throw new https_1.HttpsError("invalid-argument", "User UID and a new name (nome) are required for update.");
                }
                await firebase_admin_1.auth.updateUser(uid, { displayName: newName });
                logger.info(`User ${uid} was updated by ${request.auth.uid}.`);
                return { success: true };
            }
            case 'deleteUser': {
                const { uid: deleteUid } = data;
                if (!deleteUid) {
                    throw new https_1.HttpsError("invalid-argument", "User UID is required for deletion.");
                }
                if (deleteUid === request.auth.uid) {
                    throw new https_1.HttpsError("permission-denied", "Administrators cannot delete their own account.");
                }
                await firebase_admin_1.auth.deleteUser(deleteUid);
                logger.info(`User ${deleteUid} was deleted by ${request.auth.uid}.`);
                return { success: true };
            }
            case 'toggleRole': {
                const { uid: roleUid, role } = data;
                if (!roleUid || (role !== 'admin' && role !== 'user')) {
                    throw new https_1.HttpsError("invalid-argument", "User UID and a valid role ('admin' or 'user') are required.");
                }
                if (roleUid === request.auth.uid) {
                    throw new https_1.HttpsError("permission-denied", "Administrators cannot change their own role.");
                }
                await firebase_admin_1.auth.setCustomUserClaims(roleUid, { admin: role === 'admin' });
                logger.info(`Role for user ${roleUid} was changed to '${role}' by ${request.auth.uid}.`);
                return { success: true };
            }
            default:
                logger.warn(`[amministrazione_gestisciUtenti] Unsupported action called: '${action}'`);
                throw new https_1.HttpsError("invalid-argument", `The action '${action}' is not supported.`);
        }
    }
    catch (e) {
        logger.error(`[amministrazione_gestisciUtenti] Critical error on action '${action}':`, e);
        throw new https_1.HttpsError("internal", e.message || `An internal error occurred while performing the action: ${action}.`);
    }
});
exports.master_gestisciTecnico = (0, https_1.onCall)({ region: "europe-west6", cors: true }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    await checkAdmin(request.auth.uid);
    const operation = request.data.operation ? String(request.data.operation).trim() : null;
    const data = request.data.payload || request.data.data;
    if (!operation || !data) {
        throw new https_1.HttpsError("invalid-argument", "Incomplete payload.");
    }
    logger.info(`[master_gestisciTecnico] Executing: '${operation}' with payload:`, data);
    const { id, password } = data, restData = __rest(data, ["id", "password"]);
    try {
        if (operation === 'add') {
            if (!restData.email || !password || !restData.nome || !restData.cognome) {
                throw new https_1.HttpsError("invalid-argument", "Email, password, nome, and cognome are required for creation.");
            }
            const newUserRecord = await firebase_admin_1.auth.createUser({
                email: restData.email,
                password: password,
                displayName: `${restData.nome} ${restData.cognome}`,
                disabled: false,
            });
            const firestoreData = Object.assign(Object.assign({}, restData), { id: newUserRecord.uid, attivo: true, appAccess: true, accessoApp: true, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() });
            await firebase_admin_1.db.collection('tecnici').doc(newUserRecord.uid).set(firestoreData);
            logger.info(`Successfully created technician ${newUserRecord.uid}`);
            return { success: true, id: newUserRecord.uid };
        }
        else if (operation === 'update') {
            if (!id)
                throw new https_1.HttpsError("invalid-argument", "'id' is required for update.");
            await firebase_admin_1.db.collection('tecnici').doc(id).update(Object.assign(Object.assign({}, restData), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
            if (restData.email) {
                await firebase_admin_1.auth.updateUser(id, { email: restData.email });
            }
            logger.info(`Successfully updated technician ${id}`);
            return { success: true, id: id };
        }
        else if (operation === 'toggle-attivo') {
            if (!id || typeof restData.attivo !== 'boolean') {
                throw new https_1.HttpsError("invalid-argument", "'id' and 'attivo' (boolean) are required.");
            }
            await firebase_admin_1.db.collection('tecnici').doc(id).update({ attivo: restData.attivo, updatedAt: firestore_1.FieldValue.serverTimestamp() });
            await firebase_admin_1.auth.updateUser(id, { disabled: !restData.attivo });
            // If technician is deactivated, also block app access
            if (restData.attivo === false) {
                await firebase_admin_1.db.collection('tecnici').doc(id).update({ appAccess: false, accessoApp: false });
            }
            return { success: true };
        }
        else if (operation === 'toggle-access') {
            if (!id || typeof restData.appAccess !== 'boolean') {
                throw new https_1.HttpsError("invalid-argument", "'id' and 'appAccess' (boolean) are required.");
            }
            const tecnicoDoc = await firebase_admin_1.db.collection('tecnici').doc(id).get();
            if (!tecnicoDoc.exists || ((_a = tecnicoDoc.data()) === null || _a === void 0 ? void 0 : _a.attivo) === false) {
                throw new https_1.HttpsError("failed-precondition", "Cannot change access for an inactive technician.");
            }
            await firebase_admin_1.db.collection('tecnici').doc(id).update({ appAccess: restData.appAccess, accessoApp: restData.appAccess, updatedAt: firestore_1.FieldValue.serverTimestamp() });
            await firebase_admin_1.auth.updateUser(id, { disabled: !restData.appAccess });
            return { success: true };
        }
        else {
            logger.error(`FATAL: Operation '${operation}' did not match any IF/ELSE branch.`);
            throw new https_1.HttpsError("invalid-argument", `Operation '${operation}' is not supported.`);
        }
    }
    catch (e) {
        logger.error(`Error during '${operation}' execution:`, e);
        throw new https_1.HttpsError("internal", e.message);
    }
});
exports.deleteNotificationBatch = (0, https_1.onCall)({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);
    const collectionRef = firebase_admin_1.db.collection('notifiche');
    const batchSize = 499;
    logger.info(`[deleteNotificationBatch] Starting batch deletion for 'notifiche', requested by admin ${request.auth.uid}.`);
    try {
        let deletedCount = 0;
        let snapshot;
        do {
            snapshot = await collectionRef.limit(batchSize).get();
            if (snapshot.empty)
                break;
            const batch = firebase_admin_1.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            deletedCount += snapshot.size;
            logger.info(`[deleteNotificationBatch] Deleted a batch of ${snapshot.size} notifications.`);
        } while (snapshot.size > 0);
        logger.info(`[deleteNotificationBatch] Deletion completed. Total deleted: ${deletedCount}.`);
        return { success: true, deletedCount };
    }
    catch (e) {
        logger.error(`[deleteNotificationBatch] Critical error during batch deletion:`, e);
        throw new https_1.HttpsError("internal", e.message || "An internal server error occurred during notification deletion.");
    }
});
// Ignored/deprecated functions
exports.master_gestisciAnagrafica = (0, https_1.onCall)({ region: "europe-west6" }, async () => {
    throw new https_1.HttpsError("unimplemented", "Function not implemented.");
});
exports.master_resetPasswordTecnico = (0, https_1.onCall)({ region: "europe-west6" }, async () => {
    throw new https_1.HttpsError("unimplemented", "Function not implemented.");
});
//# sourceMappingURL=index.js.map