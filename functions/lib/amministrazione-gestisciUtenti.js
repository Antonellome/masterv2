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
exports.amministrazione_gestisciUtenti = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
exports.amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data, context) => {
    var _a, _b;
    // 1. CONTROLLO AUTENTICAZIONE E PERMESSI
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        logger.error(`Tentativo non autorizzato. UID: ${((_b = context.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'Nessuno'}`);
        throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono gestire i ruoli.");
    }
    // 2. VALIDAZIONE DATI
    const { uid, role } = data;
    if (!uid || (role !== 'admin' && role !== 'tecnico')) {
        throw new functions.https.HttpsError("invalid-argument", "Dati non validi. Fornire 'uid' e 'role' ('admin' o 'tecnico').");
    }
    logger.info(`Richiesta di impostare il ruolo '${role}' per UID: ${uid} dall'admin: ${context.auth.token.email}`);
    try {
        // 3. IMPOSTA CUSTOM CLAIM
        await admin.auth().setCustomUserClaims(uid, { role: role });
        // Opzionale: Aggiorna anche un campo nel documento utente in Firestore
        await admin.firestore().collection('tecnici').doc(uid).update({
            role: role,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        logger.info(`Ruolo '${role}' impostato con successo per UID: ${uid}`);
        return { status: "success", message: `Ruolo '${role}' aggiornato per l'utente ${uid}.` };
    }
    catch (error) {
        logger.error(`Errore nell'impostare il ruolo per UID ${uid}:`, error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError("not-found", `Nessun utente trovato in Authentication con UID: ${uid}.`);
        }
        throw new functions.https.HttpsError("internal", `Errore interno durante l'aggiornamento del ruolo. ${error.message}`);
    }
});
//# sourceMappingURL=amministrazione-gestisciUtenti.js.map