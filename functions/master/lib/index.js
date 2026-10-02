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
exports.master_resetPasswordTecnico = exports.master_gestisciAnagrafica = exports.master_gestisciTecnico = exports.amministrazione_gestisciUtenti = exports.admin_getAllUsers = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firebase_admin_1 = require("./firebase-admin");
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
// FUNZIONI PER GESTIONE AMMINISTRATORI (CORRETTE)
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
        // FILTRA E MAPPA:
        // 1. Filtra per tenere SOLO gli utenti che hanno il claim 'admin' definito.
        //    Questo esclude i tecnici, che non hanno questo claim.
        // 2. Mappa i dati per il frontend.
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
/**
 * Gestisce le operazioni CRUD sugli utenti (Creazione, Aggiornamento, Eliminazione, Cambio Ruolo).
 * Richiede privilegi di amministratore.
 */
exports.amministrazione_gestisciUtenti = (0, https_1.onCall)({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);
    const _a = request.data, { action } = _a, data = __rest(_a, ["action"]);
    logger.info(`[amministrazione_gestisciUtenti] Received action: \'${action}\'`, { data });
    try {
        switch (action) {
            case 'createUser': {
                const { email, nome, password } = data;
                if (!email || !nome || !password) {
                    throw new https_1.HttpsError("invalid-argument", "Email, nome, and password are required for user creation.");
                }
                const newUserRecord = await firebase_admin_1.auth.createUser({ email, password, displayName: nome });
                // I nuovi utenti nascono come utenti standard (NON admin) del pannello.
                // Questo claim 'admin' li distingue dai tecnici.
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
                logger.info(`Role for user ${roleUid} was changed to \'${role}\' by ${request.auth.uid}.`);
                return { success: true };
            }
            default:
                logger.warn(`[amministrazione_gestisciUtenti] Unsupported action called: \'${action}\'`);
                throw new https_1.HttpsError("invalid-argument", `The action \'${action}\' is not supported.`);
        }
    }
    catch (e) {
        logger.error(`[amministrazione_gestisciUtenti] Critical error on action \'${action}\'':`, e);
        throw new https_1.HttpsError("internal", e.message || `An internal error occurred while performing the action: ${action}.`);
    }
});
// ===============================================================================================
// FUNZIONI ESISTENTI (Lasciate intatte)
// ===============================================================================================
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
    logger.info(`[master_gestisciTecnico] Executing: \'${operation}\' with payload:`, data);
    if (operation === 'add') {
        if (!data.email || !data.password || !data.nome || !data.cognome) {
            throw new https_1.HttpsError("invalid-argument", "Email, password, nome, and cognome are required for creation.");
        }
        try {
            const newUserRecord = await firebase_admin_1.auth.createUser({
                email: data.email,
                password: data.password,
                displayName: `${data.nome} ${data.cognome}`,
                disabled: false,
            });
            // I tecnici NON hanno il claim 'admin'
            const { password } = data, firestoreData = __rest(data, ["password"]);
            const dataToSave = Object.assign(Object.assign({}, firestoreData), { id: newUserRecord.uid, attivo: true, appAccess: true, accessoApp: true, createdAt: new Date(), updatedAt: new Date() });
            await firebase_admin_1.db.collection('tecnici').doc(newUserRecord.uid).set(dataToSave);
            logger.info(`Successfully created technician ${newUserRecord.uid}`);
            return { success: true, id: newUserRecord.uid };
        }
        catch (e) {
            logger.error(`Error during \'add\' execution:`, e);
            throw new https_1.HttpsError("internal", e.message);
        }
    }
    else if (operation === 'update') {
        if (!data.id) {
            throw new https_1.HttpsError("invalid-argument", "'id' is required for update.");
        }
        try {
            const { id, password } = data, updateData = __rest(data, ["id", "password"]);
            await firebase_admin_1.db.collection('tecnici').doc(id).update(Object.assign(Object.assign({}, updateData), { updatedAt: new Date() }));
            if (updateData.email) {
                await firebase_admin_1.auth.updateUser(id, { email: updateData.email });
            }
            logger.info(`Successfully updated technician ${id}`);
            return { success: true, id: id };
        }
        catch (e) {
            logger.error(`Error during \'update\' execution:`, e);
            throw new https_1.HttpsError("internal", e.message);
        }
    }
    else if (operation === 'toggle-attivo') {
        if (!data.id || typeof data.attivo !== 'boolean') {
            throw new https_1.HttpsError("invalid-argument", "'id' and 'attivo' (boolean) are required.");
        }
        try {
            await firebase_admin_1.db.collection('tecnici').doc(data.id).update({ attivo: data.attivo, updatedAt: new Date() });
            if (data.attivo === false) {
                await firebase_admin_1.db.collection('tecnici').doc(data.id).update({ appAccess: false, accessoApp: false });
                await firebase_admin_1.auth.updateUser(data.id, { disabled: true });
            }
            else {
                await firebase_admin_1.auth.updateUser(data.id, { disabled: false });
            }
            return { success: true };
        }
        catch (e) {
            logger.error(`Error during \'toggle-attivo\' execution:`, e);
            throw new https_1.HttpsError("internal", e.message);
        }
    }
    else if (operation === 'toggle-access') {
        if (!data.id || typeof data.appAccess !== 'boolean') {
            throw new https_1.HttpsError("invalid-argument", "'id' and 'appAccess' (boolean) are required.");
        }
        const tecnicoDoc = await firebase_admin_1.db.collection('tecnici').doc(data.id).get();
        if (!tecnicoDoc.exists || ((_a = tecnicoDoc.data()) === null || _a === void 0 ? void 0 : _a.attivo) === false) {
            throw new https_1.HttpsError("failed-precondition", "Cannot change access for an inactive technician.");
        }
        await firebase_admin_1.db.collection('tecnici').doc(data.id).update({ appAccess: data.appAccess, accessoApp: data.appAccess, updatedAt: new Date() });
        await firebase_admin_1.auth.updateUser(data.id, { disabled: !data.appAccess });
        return { success: true };
    }
    else {
        logger.error(`FATAL: Operation \'${operation}\' did not match any IF/ELSE branch.`);
        throw new https_1.HttpsError("invalid-argument", `Operation \'${operation}\' is not supported.`);
    }
});
// Ignored functions
exports.master_gestisciAnagrafica = (0, https_1.onCall)({ region: "europe-west6" }, async (request) => {
    throw new https_1.HttpsError("unimplemented", "Function not implemented.");
});
exports.master_resetPasswordTecnico = (0, https_1.onCall)({ region: "europe-west6" }, async (request) => {
    throw new https_1.HttpsError("unimplemented", "Function not implemented.");
});
//# sourceMappingURL=index.js.map