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
    var _a, _b, _c;
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        logger.error(`Tentativo non autorizzato da UID: ${((_b = context.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'Nessuno'}`);
        throw new functions.https.HttpsError("permission-denied", "Solo un amministratore può eseguire questa operazione.");
    }
    const { action } = data;
    const adminUid = context.auth.uid;
    logger.info(`Azione '${action}' richiesta da admin: ${context.auth.token.email}`);
    try {
        switch (action) {
            case 'createUser':
                if (!data.email || !data.password || !data.nome) {
                    throw new functions.https.HttpsError("invalid-argument", "Email, password e nome sono richiesti.");
                }
                const userRecord = await admin.auth().createUser({ email: data.email, password: data.password, displayName: data.nome });
                logger.info(`Utente creato in Auth con UID: ${userRecord.uid}`);
                await admin.firestore().collection('utenti_master').doc(userRecord.uid).set({
                    nome: data.nome,
                    email: data.email,
                    telefono: 'N/D',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                logger.info(`Documento creato in utenti_master per UID: ${userRecord.uid}`);
                await admin.auth().generatePasswordResetLink(data.email);
                logger.info(`Invio email reset password per: ${data.email}`);
                return { status: "success", message: `Utente ${data.nome} creato.`, uid: userRecord.uid };
            case 'updateUser':
                if (!data.uid || !data.nome) {
                    throw new functions.https.HttpsError("invalid-argument", "UID e nome sono richiesti.");
                }
                await admin.auth().updateUser(data.uid, { displayName: data.nome });
                await admin.firestore().collection('utenti_master').doc(data.uid).update({ nome: data.nome, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                logger.info(`Utente ${data.uid} aggiornato.`);
                return { status: "success", message: "Utente aggiornato." };
            case 'deleteUser':
                if (!data.uid) {
                    throw new functions.https.HttpsError("invalid-argument", "L'UID è richiesto.");
                }
                if (data.uid === adminUid) {
                    throw new functions.https.HttpsError("permission-denied", "Un admin non può eliminare se stesso.");
                }
                await admin.auth().deleteUser(data.uid);
                await admin.firestore().collection('utenti_master').doc(data.uid).delete();
                await admin.firestore().collection('admins').doc(data.uid).delete();
                logger.info(`Utente ${data.uid} eliminato.`);
                return { status: "success", message: "Utente eliminato." };
            // --- NUOVA AZIONE CENTRALIZZATA PER GESTIRE I RUOLI ---
            case 'toggleRole':
                if (!data.uid || !data.role) {
                    throw new functions.https.HttpsError("invalid-argument", "UID e ruolo sono richiesti.");
                }
                if (data.uid === adminUid) {
                    throw new functions.https.HttpsError("permission-denied", "Non puoi modificare il tuo stesso ruolo.");
                }
                const adminDocRef = admin.firestore().collection('admins').doc(data.uid);
                const userDocRef = admin.firestore().collection('utenti_master').doc(data.uid);
                const userDoc = await userDocRef.get();
                if (!userDoc.exists) {
                    throw new functions.https.HttpsError("not-found", "Utente non trovato in utenti_master.");
                }
                const userData = userDoc.data();
                if (data.role === 'admin') {
                    await adminDocRef.set({ email: userData.email, nome: userData.nome });
                    logger.info(`Utente ${data.uid} promosso ad admin.`);
                }
                else {
                    await adminDocRef.delete();
                    logger.info(`Privilegi admin revocati per l'utente ${data.uid}.`);
                }
                return { status: "success", message: "Ruolo utente aggiornato." };
            default:
                logger.warn(`Azione non riconosciuta: '${action}'.`);
                throw new functions.https.HttpsError("unimplemented", `L'azione '${action}' non è supportata.`);
        }
    }
    catch (error) {
        logger.error(`Errore durante l'azione '${action}' per UID ${data.uid || 'N/D'}:`, error);
        // Rilancia errori specifici per una gestione più chiara nel frontend
        if ((_c = error.code) === null || _c === void 0 ? void 0 : _c.startsWith('auth/')) {
            throw new functions.https.HttpsError("already-exists", error.message);
        }
        throw new functions.https.HttpsError("internal", `Errore interno: ${error.message}`);
    }
});
//# sourceMappingURL=amministrazione-gestisciUtenti.js.map