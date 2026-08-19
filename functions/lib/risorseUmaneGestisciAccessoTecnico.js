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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const REGION = "europe-west1";
exports.risorseUmane_gestisciAccessoTecnico = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a, _b;
    // 1. Autenticazione e Autorizzazione
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        firebase_functions_1.logger.error(`Tentativo non autorizzato di gestire accesso. UID: ${((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'Nessuno'}`);
        throw new https_1.HttpsError("permission-denied", "Solo gli amministratori possono eseguire questa operazione.");
    }
    // 2. Validazione Input
    const { uid, action } = request.data;
    if (!uid || (action !== "enable" && action !== "disable")) {
        throw new https_1.HttpsError("invalid-argument", "Dati non validi. Fornire 'uid' e 'action' ('enable'/'disable').");
    }
    firebase_functions_1.logger.info(`Richiesta di ${action} per UID: ${uid} dall'admin: ${request.auth.token.email}`);
    const db = admin.firestore();
    const auth = admin.auth();
    const newState = action === "enable";
    try {
        // 3. Trova il documento del tecnico basandosi sul CAMPO 'uid'.
        const tecniciRef = db.collection("tecnici");
        const querySnapshot = await tecniciRef.where("uid", "==", uid).limit(1).get();
        if (querySnapshot.empty) {
            firebase_functions_1.logger.error(`ERRORE CRITICO: Nessun documento tecnico trovato in Firestore per l'UID: ${uid}.`);
        }
        else {
            const tecnicoDoc = querySnapshot.docs[0];
            firebase_functions_1.logger.info(`Trovato documento tecnico: ${tecnicoDoc.id}. Aggiornamento di 'appAccess' a ${newState}...`);
            await tecnicoDoc.ref.update({ appAccess: newState });
            firebase_functions_1.logger.info(`Documento Firestore ${tecnicoDoc.id} aggiornato con successo.`);
        }
        // 4. Aggiorna lo stato dell'utente in Firebase Authentication
        await auth.updateUser(uid, { disabled: !newState });
        firebase_functions_1.logger.info(`Stato utente in Authentication per UID: ${uid} aggiornato. Disabilitato: ${!newState}`);
        const actionText = newState ? "abilitato" : "revocato";
        const message = `Accesso ${actionText} con successo per l'utente con UID: ${uid}.`;
        return { status: "success", message: message };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Fallimento nella gestione dell'accesso per UID ${uid}:`, error);
        if (error.code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", `CRITICO: Nessun utente trovato in Authentication con UID: ${uid}. Impossibile procedere.`);
        }
        throw new https_1.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
    }
});
//# sourceMappingURL=risorseUmaneGestisciAccessoTecnico.js.map