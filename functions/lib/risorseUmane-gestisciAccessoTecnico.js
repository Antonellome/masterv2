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
Object.defineProperty(exports, "__esModule", { value: true });
exports.risorseUmane_gestisciAccessoTecnico = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
exports.risorseUmane_gestisciAccessoTecnico = functions.region("europe-west1").https.onCall(async (data, context) => {
    var _a, _b;
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        logger.error(`Tentativo non autorizzato. UID: ${((_b = context.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'Nessuno'}`);
        throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono gestire l'accesso.");
    }
    const { uid, action } = data;
    if (!uid || (action !== "enable" && action !== "disable")) {
        throw new functions.https.HttpsError("invalid-argument", "Dati non validi. Fornire 'uid' e 'action' ('enable'/'disable').");
    }
    logger.info(`Richiesta di ${action} per UID: ${uid} dall'admin: ${context.auth.token.email}`);
    try {
        const newState = action === "enable";
        await admin.auth().updateUser(uid, { disabled: !newState });
        logger.info(`Stato utente in Auth aggiornato per UID: ${uid}`);
        const tecnicoRef = admin.firestore().collection("tecnici").doc(uid);
        await tecnicoRef.update({ appAccess: newState });
        logger.info(`Stato documento in Firestore aggiornato per UID: ${uid}`);
        const actionText = newState ? "abilitato" : "revocato";
        const message = `Accesso ${actionText} con successo per l'utente con UID: ${uid}.`;
        return { status: "success", message: message };
    }
    catch (error) {
        logger.error(`Errore durante l'aggiornamento dell'accesso per UID ${uid}:`, error);
        if (error.code === "auth/user-not-found") {
            throw new functions.https.HttpsError("not-found", `Nessun utente trovato in Authentication con UID: ${uid}.`);
        }
        throw new functions.https.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
    }
});
//# sourceMappingURL=risorseUmane-gestisciAccessoTecnico.js.map