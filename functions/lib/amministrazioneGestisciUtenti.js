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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const REGION = "europe-west1";
exports.amministrazione_gestisciUtenti = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a, _b, _c;
    // --- CONTROLLO AUTORIZZAZIONE ---
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== "admin") {
        firebase_functions_1.logger.error(`Tentativo non autorizzato da UID: ${(_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid}`);
        throw new https_1.HttpsError("permission-denied", "Solo un amministratore può eseguire questa operazione.");
    }
    const { action, uid, nome, email, password, role } = request.data;
    try {
        switch (action) {
            case 'createUser': {
                if (!email || !nome) {
                    throw new https_1.HttpsError("invalid-argument", "Email e nome sono richiesti per la creazione.");
                }
                const userRecord = await admin.auth().createUser({ email, password, displayName: nome });
                const newRole = role === 'admin' ? 'admin' : 'user';
                await admin.auth().setCustomUserClaims(userRecord.uid, { role: newRole });
                firebase_functions_1.logger.info(`Utente ${nome} (${userRecord.uid}) creato con ruolo: ${newRole}.`);
                return { status: "success", message: "Utente creato con successo." };
            }
            case 'updateUser': {
                if (!uid || !nome) {
                    throw new https_1.HttpsError("invalid-argument", "UID e nome sono richiesti per l'aggiornamento.");
                }
                await admin.auth().updateUser(uid, { displayName: nome });
                firebase_functions_1.logger.info(`Display Name per l'utente ${uid} aggiornato a: ${nome}.`);
                return { status: "success", message: "Nome utente aggiornato con successo." };
            }
            case 'deleteUser': {
                if (!uid) {
                    throw new https_1.HttpsError("invalid-argument", "L'UID è richiesto per l'eliminazione.");
                }
                if (uid === request.auth.uid) {
                    throw new https_1.HttpsError("permission-denied", "Un admin non può eliminare se stesso.");
                }
                await admin.auth().deleteUser(uid);
                firebase_functions_1.logger.info(`Utente ${uid} eliminato da Firebase Authentication.`);
                return { status: "success", message: "Utente eliminato con successo." };
            }
            case 'toggleRole': {
                if (!uid || !role) {
                    throw new https_1.HttpsError("invalid-argument", "UID e ruolo sono richiesti.");
                }
                if (uid === request.auth.uid) {
                    throw new https_1.HttpsError("permission-denied", "Non puoi modificare il tuo stesso ruolo.");
                }
                await admin.auth().setCustomUserClaims(uid, { role });
                firebase_functions_1.logger.info(`Ruolo per l'utente ${uid} aggiornato a: ${role}.`);
                return { status: "success", message: "Ruolo utente aggiornato." };
            }
            default:
                firebase_functions_1.logger.warn(`Azione non riconosciuta: '${action}'.`);
                throw new https_1.HttpsError("unimplemented", `L'azione '${action}' non è supportata.`);
        }
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante l'azione '${action}' per UID ${uid || 'N/D'}:`, error);
        // Evita di esporre dettagli interni, ma fornisce un contesto utile
        if ((_c = error.code) === null || _c === void 0 ? void 0 : _c.startsWith('auth/')) {
            throw new https_1.HttpsError("internal", `Errore di autenticazione: ${error.message}`);
        }
        throw new https_1.HttpsError("internal", `Si è verificato un errore interno durante l'operazione.`);
    }
});
//# sourceMappingURL=amministrazioneGestisciUtenti.js.map