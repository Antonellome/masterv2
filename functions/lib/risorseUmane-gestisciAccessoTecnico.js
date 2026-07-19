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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.risorseUmane_gestisciAccessoTecnico = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
// L'SDK di Admin è già inizializzato nel file index.ts principale
exports.risorseUmane_gestisciAccessoTecnico = functions.region("europe-west1").https.onCall(async (data, context) => {
    var _a;
    // 1. CONTROLLO AUTENTICAZIONE E PERMESSI DA AMMINISTRATORE
    if (!context.auth || context.auth.token.role !== 'admin') {
        logger.error(`Tentativo non autorizzato a risorseUmane_gestisciAccessoTecnico. UID: ${(_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid}`);
        throw new functions.https.HttpsError("permission-denied", "Accesso negato. Solo gli amministratori possono eseguire questa operazione.");
    }
    // 2. VALIDAZIONE DATI IN INGRESSO
    const { uid, action } = data;
    if (!uid || (action !== "enable" && action !== "disable")) {
        throw new functions.https.HttpsError("invalid-argument", "Dati non validi. È necessario fornire 'uid' e 'action' (enable/disable).");
    }
    logger.info(`Richiesta di ${action} per UID: ${uid} dall'admin: ${context.auth.token.email}`);
    try {
        // 3. LOGICA PRINCIPALE
        const newState = action === "enable";
        // Aggiorna lo stato in Firebase Authentication
        await admin.auth().updateUser(uid, { disabled: !newState });
        logger.info(`Stato utente in Auth aggiornato per UID: ${uid}`);
        // Aggiorna lo stato nel documento Firestore
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