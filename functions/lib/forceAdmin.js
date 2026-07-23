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
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Funzione onCall per forzare l'assegnazione del ruolo di amministratore a un utente.
 * Imposta un custom claim `admin` a `true` per l'utente che la invoca.
 */
exports.forceAdmin = (0, https_1.onCall)({ region: "europe-west1", cors: true }, // Imposta la regione e abilita CORS
async (request) => {
    // 1. Controlla che la richiesta sia autenticata
    if (!request.auth) {
        logger.error("forceAdmin: Richiesta non autenticata.");
        throw new https_1.HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
    }
    const uid = request.auth.uid;
    logger.info(`forceAdmin: Inizio processo per UID: ${uid}`);
    try {
        // 2. Imposta il custom claim utilizzando l'SDK di Admin
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        logger.info(`forceAdmin: Custom claim 'admin: true' impostato con successo per l'UID: ${uid}.`);
        // 3. Restituisce un risultato di successo
        return {
            success: true,
            message: `L'utente ${uid} è stato promosso ad amministratore.`
        };
    }
    catch (error) {
        logger.error(`forceAdmin: Errore durante l'impostazione del custom claim per l'UID: ${uid}`, error);
        throw new https_1.HttpsError("internal", "Si è verificato un errore interno durante l'assegnazione dei permessi.");
    }
});
//# sourceMappingURL=forceAdmin.js.map