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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const REGION = "europe-west1";
/**
 * Funzione Callable per forzare un utente a diventare admin.
 * RICHIEDE CHE IL CHIAMANTE SIA GIÀ UN ADMIN.
 */
exports.forceAdmin = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a, _b;
    // 1. Controlla che chi chiama sia un admin.
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        logger.error(`Tentativo non autorizzato di usare forceAdmin da UID: ${(_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid}`);
        throw new https_1.HttpsError("permission-denied", "Solo un amministratore può usare questa funzione.");
    }
    const { email } = request.data;
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "L'indirizzo email è richiesto.");
    }
    logger.info(`L'admin ${request.auth.token.email} sta promuovendo l'utente con email: ${email}`);
    try {
        // 2. Trova l'utente tramite email
        const userRecord = await admin.auth().getUserByEmail(email);
        const { uid } = userRecord;
        // 3. Imposta il Custom Claim standard 'role'
        await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
        logger.info(`SUCCESS: Utente ${email} (UID: ${uid}) è stato promosso ad amministratore.`);
        return {
            status: "success",
            message: `L'utente ${email} è ora un amministratore.`,
        };
    }
    catch (error) {
        logger.error(`Errore durante la promozione dell'utente ${email}:`, error);
        if (error.code === 'auth/user-not-found') {
            throw new https_1.HttpsError("not-found", `Nessun utente trovato con l'email ${email}.`);
        }
        throw new https_1.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
    }
});
//# sourceMappingURL=forceAdmin.js.map