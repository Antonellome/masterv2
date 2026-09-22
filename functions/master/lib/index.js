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
exports.master_resetPasswordTecnico = exports.master_gestisciAnagrafica = exports.master_gestisciTecnico = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firebase_admin_1 = require("./firebase-admin");
const checkAdmin = async (uid) => {
    var _a;
    const user = await firebase_admin_1.auth.getUser(uid);
    if (((_a = user.customClaims) === null || _a === void 0 ? void 0 : _a['admin']) !== true) {
        throw new https_1.HttpsError("permission-denied", "This operation is restricted to administrators.");
    }
};
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
    // --- LOGICA DI CREAZIONE --- 
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
            const { password } = data, firestoreData = __rest(data, ["password"]);
            const dataToSave = Object.assign(Object.assign({}, firestoreData), { id: newUserRecord.uid, attivo: true, appAccess: true, accessoApp: true, createdAt: new Date(), updatedAt: new Date() });
            // +++ LOG DI DEBUG AGGIUNTO +++
            logger.info("[master_gestisciTecnico] Attempting to save data to Firestore:", dataToSave);
            await firebase_admin_1.db.collection('tecnici').doc(newUserRecord.uid).set(dataToSave);
            logger.info(`Successfully created user ${newUserRecord.uid}`);
            return { success: true, id: newUserRecord.uid };
        }
        catch (e) {
            // +++ LOG DI DEBUG AGGIUNTO +++
            logger.error(`Error during 'add' execution. Full error object:`, e);
            throw new https_1.HttpsError("internal", e.message);
        }
        // --- LOGICA DI AGGIORNAMENTO ---
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
            logger.error(`Error during 'update' execution:`, e);
            throw new https_1.HttpsError("internal", e.message);
        }
        // --- LOGICA DI STATO --- 
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
            logger.error(`Error during 'toggle-attivo' execution:`, e);
            throw new https_1.HttpsError("internal", e.message);
        }
        // --- LOGICA DI ACCESSO ---
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
        logger.error(`FATAL: Operation '${operation}' did not match any IF/ELSE branch.`);
        throw new https_1.HttpsError("invalid-argument", `Operation '${operation}' is not supported.`);
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