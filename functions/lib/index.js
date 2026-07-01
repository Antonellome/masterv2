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
exports.executeMigration = exports.forceAdmin = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
// Inizializza l'SDK di Admin UNA SOLA VOLTA
admin.initializeApp();
// --- ESPORTAZIONE FUNZIONI PULITE ---
// 1. Esporta la funzione forceAdmin
const forceAdmin_1 = require("./forceAdmin");
exports.forceAdmin = forceAdmin_1.forceAdmin;
// 2. Esporta una versione di TEST di executeMigration
exports.executeMigration = (0, https_1.onCall)({ region: "europe-west1", cors: true }, async (request) => {
    logger.info("========================================");
    logger.info(">>> FUNZIONE DI PROVA (v2) AVVIATA <<<");
    logger.info("========================================");
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La richiesta deve essere autenticata.");
    }
    if (request.auth.token.role !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "Accesso negato. Ruolo 'admin' richiesto.");
    }
    logger.info(`[PROVA v2] Controllo permessi OK per admin: ${request.auth.uid}`);
    return {
        success: true,
        message: "DEPLOY PULITO OK! La funzione di test è ora attiva e funzionante.",
        createdCount: 0
    };
});
//# sourceMappingURL=index.js.map