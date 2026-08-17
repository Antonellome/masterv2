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
    var _a;
    // --- CONTROLLO AUTORIZZAZIONE ---
    if (!context.auth || context.auth.token.admin !== true) {
        logger.error(`Tentativo non autorizzato da UID: ${(_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid}`);
        throw new functions.https.HttpsError("permission-denied", "Solo un amministratore può eseguire questa operazione.");
    }
    const { action, uid, nome, email, password, role, makeAdmin } = data;
    try {
        switch (action) {
            case 'createUser': {
                if (!email || !nome) {
                    throw new functions.https.HttpsError("invalid-argument", "Email e nome sono richiesti per la creazione.");
                }
                const userRecord = await admin.auth().createUser({ email, password, displayName: nome });
                const isAdmin = makeAdmin === true;
                await admin.auth().setCustomUserClaims(userRecord.uid, {
                    livello: 'staff',
                    admin: isAdmin
                });
                logger.info(`Utente ${nome} (${userRecord.uid}) creato come staff. Admin: ${isAdmin}.`);
                return { status: "success", message: "Utente creato con successo." };
            }
            case 'updateUser': {
                if (!uid || !nome) {
                    throw new functions.https.HttpsError("invalid-argument", "UID e nome sono richiesti per l'aggiornamento.");
                }
                // **FIX**: Aggiorna anche il Display Name in Firebase Authentication
                await admin.auth().updateUser(uid, { displayName: nome });
                logger.info(`Display Name per l'utente ${uid} aggiornato a: ${nome}.`);
                return { status: "success", message: "Nome utente aggiornato con successo." };
            }
            case 'deleteUser': {
                if (!uid) {
                    throw new functions.https.HttpsError("invalid-argument", "L'UID è richiesto per l'eliminazione.");
                }
                if (uid === context.auth.uid) {
                    throw new functions.https.HttpsError("permission-denied", "Un admin non può eliminare se stesso.");
                }
                await admin.auth().deleteUser(uid);
                logger.info(`Utente ${uid} eliminato da Firebase Authentication.`);
                return { status: "success", message: "Utente eliminato con successo." };
            }
            case 'toggleRole': {
                if (!uid || !role) {
                    throw new functions.https.HttpsError("invalid-argument", "UID e ruolo sono richiesti.");
                }
                if (uid === context.auth.uid) {
                    throw new functions.https.HttpsError("permission-denied", "Non puoi modificare il tuo stesso ruolo.");
                }
                // **FIX CRITICO**: Preserva i claims esistenti
                const user = await admin.auth().getUser(uid);
                const currentClaims = user.customClaims || {};
                const newIsAdmin = role === 'admin';
                await admin.auth().setCustomUserClaims(uid, Object.assign(Object.assign({}, currentClaims), { admin: newIsAdmin }));
                logger.info(`Ruolo per l'utente ${uid} aggiornato. Nuovo stato admin: ${newIsAdmin}.`);
                return { status: "success", message: "Ruolo utente aggiornato." };
            }
            default:
                logger.warn(`Azione non riconosciuta: '${action}'.`);
                throw new functions.https.HttpsError("unimplemented", `L'azione '${action}' non è supportata.`);
        }
    }
    catch (error) {
        logger.error(`Errore durante l'azione '${action}' per UID ${uid || 'N/D'}:`, error);
        throw new functions.https.HttpsError("internal", `Errore interno: ${error.message}`);
    }
});
//# sourceMappingURL=amministrazioneGestisciUtenti.js.map