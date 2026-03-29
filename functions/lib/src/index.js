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
exports.syncDataTrigger = exports.manageUsers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Funzione centralizzata per la gestione degli utenti
exports.manageUsers = functions.region("europe-west1").https.onCall(async (data, context) => {
    var _a, _b, _c;
    // Controllo di sicurezza: solo gli admin possono eseguire queste operazioni
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Richiesta non autorizzata. Privilegi di Amministratore richiesti.");
    }
    const { action, payload } = data;
    const callingUid = (_c = context.auth) === null || _c === void 0 ? void 0 : _c.uid;
    switch (action) {
        case 'list': {
            try {
                const userRecords = await admin.auth().listUsers(1000);
                const users = userRecords.users
                    .filter(user => { var _a; return ((_a = user.customClaims) === null || _a === void 0 ? void 0 : _a.role) !== 'tecnico'; })
                    .map(user => {
                    var _a;
                    return ({
                        uid: user.uid,
                        email: user.email || 'N/A',
                        role: ((_a = user.customClaims) === null || _a === void 0 ? void 0 : _a.role) || 'Nessuno',
                        disabled: user.disabled,
                    });
                });
                return { users };
            }
            catch (error) {
                console.error("Errore nel recuperare la lista utenti:", error);
                throw new functions.https.HttpsError("internal", "Impossibile recuperare la lista utenti.");
            }
        }
        case 'setRole': {
            // ... (logica invariata)
        }
        case 'setStatus': {
            const { uid, disabled } = payload;
            if (!uid || typeof disabled !== 'boolean') {
                throw new functions.https.HttpsError("invalid-argument", "Payload non valido. 'uid' e 'disabled' (booleano) sono obbligatori.");
            }
            if (callingUid === uid) {
                throw new functions.https.HttpsError("failed-precondition", "Un amministratore non può disabilitare il proprio account.");
            }
            try {
                await admin.auth().updateUser(uid, { disabled: disabled });
                const status = disabled ? "disabilitato" : "abilitato";
                return { message: `Utente ${uid} ${status} con successo.` };
            }
            catch (error) {
                console.error(`Errore nell'aggiornare lo stato per ${uid}:`, error);
                throw new functions.https.HttpsError("internal", "Errore durante l'aggiornamento dello stato dell'utente.");
            }
        }
        case 'createUser': {
            const { email } = payload;
            if (!email) {
                throw new functions.https.HttpsError("invalid-argument", "L'email è obbligatoria per creare un utente.");
            }
            try {
                const userRecord = await admin.auth().createUser({ email: email, emailVerified: false });
                // Imposta il ruolo di default a 'admin' per i nuovi utenti creati da questa interfaccia
                await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
                return { message: `Utente creato con email ${email} e ruolo 'admin'.` };
            }
            catch (error) {
                console.error(`Errore nella creazione dell'utente con email ${email}:`, error);
                throw new functions.https.HttpsError("internal", "Impossibile creare l'utente. L'email potrebbe essere già in uso.");
            }
        }
        case 'deleteUser': {
            const { uid } = payload;
            if (!uid) {
                throw new functions.https.HttpsError("invalid-argument", "L'UID dell'utente è obbligatorio.");
            }
            if (callingUid === uid) {
                throw new functions.https.HttpsError("failed-precondition", "Un amministratore non può eliminare il proprio account.");
            }
            try {
                await admin.auth().deleteUser(uid);
                return { message: `Utente ${uid} eliminato con successo.` };
            }
            catch (error) {
                console.error(`Errore nell'eliminazione dell'utente ${uid}:`, error);
                throw new functions.https.HttpsError("internal", "Errore durante l'eliminazione dell'utente.");
            }
        }
        default:
            throw new functions.https.HttpsError("invalid-argument", `Azione '${action}' non riconosciuta.`);
    }
});
// Trigger per la sincronizzazione dei dati (logica invariata)
exports.syncDataTrigger = functions.region("europe-west1").firestore
    .document("config/syncManifest")
    .onUpdate(async (change, context) => {
    console.log("Sync Manifest aggiornato. Trigger per la notifica PUSH attivato.");
    const newData = change.after.data();
    console.log("Nuovo stato del manifest:", newData);
    // TODO: Implementare la logica di invio notifica PUSH silenziosa (FCM)
    console.log("LOGICA PUSH NON ANCORA IMPLEMENTATA.");
    return Promise.resolve();
});
//# sourceMappingURL=index.js.map