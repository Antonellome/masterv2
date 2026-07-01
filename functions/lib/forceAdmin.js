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
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
/**
 * Funzione per forzare l'impostazione del custom claim 'role' a 'admin'.
 * Può essere chiamata solo da un utente già autenticato.
 * Questa è una misura di sicurezza per sincronizzare i permessi se il client
 * per qualche motivo non ha ricevuto il token aggiornato.
 */
exports.forceAdmin = (0, https_1.onCall)({ region: "europe-west1", cors: true }, async (request) => {
    var _a;
    logger.info(`[forceAdmin] Invocata da UID: ${(_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid}`);
    if (!request.auth) {
        logger.error("[forceAdmin] Chiamata non autenticata.");
        throw new https_1.HttpsError("unauthenticated", "La richiesta deve essere autenticata.");
    }
    const uid = request.auth.uid;
    const currentClaims = request.auth.token;
    if (currentClaims.role === "admin") {
        logger.info(`[forceAdmin] L'utente ${uid} è già admin. Nessuna azione necessaria.`);
        return { success: true, message: "L'utente è già un amministratore." };
    }
    try {
        await admin.auth().setCustomUserClaims(uid, { role: "admin" });
        logger.info(`[forceAdmin] Custom claim 'role: admin' impostato con successo per l'utente ${uid}.`);
        return { success: true, message: "Privilegi di amministratore concessi con successo." };
    }
    catch (error) {
        logger.error(`[forceAdmin] Errore durante l'impostazione dei custom claims per l'utente ${uid}:`, error);
        throw new https_1.HttpsError("internal", "Errore interno durante l'aggiornamento dei permessi.");
    }
});
//# sourceMappingURL=forceAdmin.js.map