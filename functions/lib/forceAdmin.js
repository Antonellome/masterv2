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
exports.forceAdmin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Funzione Callable per forzare un utente a diventare admin.
 * DA USARE CON ESTREMA CAUTELA E DA DISABILITARE/ELIMINARE DOPO L'USO.
 */
exports.forceAdmin = functions.region("europe-west1").https.onCall(async (data, context) => {
    // 1. Controlla che chi chiama sia un admin (o che non ci sia nessun admin per il bootstrap iniziale)
    // Per il bootstrap iniziale, commentiamo temporaneamente il controllo di sicurezza.
    /*
    if (context.auth?.token.admin !== true) {
      logger.error(`Tentativo non autorizzato di usare forceAdmin da UID: ${context.auth?.uid}`);
      throw new functions.https.HttpsError("permission-denied", "Solo un amministratore può usare questa funzione.");
    }
    */
    const { email } = data;
    if (!email) {
        throw new functions.https.HttpsError("invalid-argument", "L'indirizzo email è richiesto.");
    }
    logger.info(`Tentativo di promuovere ad admin l'utente con email: ${email}`);
    try {
        // 2. Trova l'utente tramite email
        const userRecord = await admin.auth().getUserByEmail(email);
        const { uid } = userRecord;
        // 3. Imposta il Custom Claim
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        logger.info(`SUCCESS: Utente ${email} (UID: ${uid}) è stato promosso ad amministratore.`);
        return {
            status: "success",
            message: `L'utente ${email} è ora un amministratore.`,
        };
    }
    catch (error) {
        logger.error(`Errore durante la promozione dell'utente ${email}:`, error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError("not-found", `Nessun utente trovato con l'email ${email}.`);
        }
        throw new functions.https.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
    }
});
//# sourceMappingURL=forceAdmin.js.map