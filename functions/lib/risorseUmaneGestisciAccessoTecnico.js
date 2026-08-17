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
    var _a;
    // 1. Autenticazione e Autorizzazione
    if (!context.auth || context.auth.token.role !== 'admin') {
        logger.error(`Tentativo non autorizzato di gestire accesso. UID: ${((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'Nessuno'}`);
        throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono eseguire questa operazione.");
    }
    // 2. Validazione Input
    const { uid, action } = data;
    if (!uid || (action !== "enable" && action !== "disable")) {
        throw new functions.https.HttpsError("invalid-argument", "Dati non validi. Fornire 'uid' e 'action' ('enable'/'disable').");
    }
    logger.info(`Richiesta di ${action} per UID: ${uid} dall'admin: ${context.auth.token.email}`);
    const db = admin.firestore();
    const auth = admin.auth();
    const newState = action === "enable";
    try {
        // 3. Trova il documento del tecnico basandosi sul CAMPO 'uid', non sull'ID del documento.
        const tecniciRef = db.collection("tecnici");
        const querySnapshot = await tecniciRef.where("uid", "==", uid).limit(1).get();
        if (querySnapshot.empty) {
            logger.error(`ERRORE CRITICO: Nessun documento tecnico trovato in Firestore per l'UID: ${uid}. L'utente esiste in Auth ma non nel DB.`);
            // Nonostante l'errore nel DB, procediamo con l'aggiornamento in Auth per mantenere la coerenza con la richiesta.
            // Potrebbe essere necessario un intervento manuale per allineare Firestore.
        }
        else {
            const tecnicoDoc = querySnapshot.docs[0];
            logger.info(`Trovato documento tecnico: ${tecnicoDoc.id} per UID: ${uid}. Aggiornamento di 'appAccess' a ${newState}...`);
            // Aggiorna il documento corretto in Firestore
            await tecnicoDoc.ref.update({ appAccess: newState });
            logger.info(`Documento Firestore ${tecnicoDoc.id} aggiornato con successo.`);
        }
        // 4. Aggiorna lo stato dell'utente in Firebase Authentication
        await auth.updateUser(uid, { disabled: !newState });
        logger.info(`Stato utente in Authentication aggiornato per UID: ${uid}. Disabilitato: ${!newState}`);
        const actionText = newState ? "abilitato" : "revocato";
        const message = `Accesso ${actionText} con successo per l'utente con UID: ${uid}.`;
        return { status: "success", message: message };
    }
    catch (error) {
        logger.error(`Fallimento nella gestione dell'accesso per UID ${uid}:`, error);
        if (error.code === "auth/user-not-found") {
            throw new functions.https.HttpsError("not-found", `CRITICO: Nessun utente trovato in Authentication con UID: ${uid}. Impossibile procedere.`);
        }
        throw new functions.https.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
    }
});
//# sourceMappingURL=risorseUmaneGestisciAccessoTecnico.js.map