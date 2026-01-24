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
exports.deleteUser = exports.setUserDisabledStatus = exports.onUserCreate = exports.createNewUser = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
/**
 * FUNZIONE #1: Creazione Manuale Utente (chiamata dal frontend)
 * Crea un utente in Auth e scrive i suoi dati in Firestore.
 * Restituisce l'utente completo al client per l'aggiornamento della UI.
 */
exports.createNewUser = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.ruolo !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono creare utenti.");
    }
    const { email, nome, ruolo } = data;
    if (!email || !nome || !ruolo) {
        throw new functions.https.HttpsError("invalid-argument", "Email, nome e ruolo sono obbligatori.");
    }
    try {
        const userRecord = await admin.auth().createUser({ email, emailVerified: false, disabled: false });
        await admin.auth().setCustomUserClaims(userRecord.uid, { ruolo });
        const userDoc = { nome, email, ruolo, disabled: false };
        await admin.firestore().collection("utenti_master").doc(userRecord.uid).set(userDoc);
        // Fondamentale: restituisce l'utente con l'ID per abilitare subito le azioni nel frontend.
        return { status: "success", newUser: { id: userRecord.uid, ...userDoc } };
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * FUNZIONE #2: Trigger Automatico Creazione Utente (chiamata da Firebase)
 * Si attiva quando un utente viene creato in Auth (es. da terze parti o direttamente da Firebase).
 * Assicura che per ogni utente in Auth esista un documento corrispondente in Firestore con i dati base.
 * QUESTA ERA LA FUNZIONE MANCANTE CHE CAUSAVA IL BUG.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email } = user;
    // Previene la sovrascrittura se il documento esiste già (creato da createNewUser)
    const userRef = admin.firestore().collection("utenti_master").doc(uid);
    const doc = await userRef.get();
    if (doc.exists) {
        console.log(`Il documento per l'utente ${uid} esiste già. Nessuna azione richiesta.`);
        return;
    }
    console.log(`Creazione documento per il nuovo utente: ${uid}`);
    const userDoc = {
        nome: email || 'Nuovo Utente',
        email: email || '',
        ruolo: 'user', // Ruolo di default
        disabled: false,
    };
    try {
        await userRef.set(userDoc);
        console.log(`Documento per ${uid} creato con successo.`);
    }
    catch (error) {
        console.error(`Errore nella creazione del documento per ${uid}:`, error);
    }
});
/**
 * FUNZIONE #3: Abilita/Disabilita Utente
 * Aggiorna lo stato 'disabled' sia in Auth che in Firestore per coerenza.
 */
exports.setUserDisabledStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.ruolo !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono modificare gli utenti.");
    }
    const { uid, disabled } = data;
    if (!uid || typeof disabled !== 'boolean') {
        throw new functions.https.HttpsError("invalid-argument", "UID e stato 'disabled' sono obbligatori.");
    }
    try {
        // Aggiornamento coerente su entrambi i servizi
        await admin.auth().updateUser(uid, { disabled });
        await admin.firestore().collection("utenti_master").doc(uid).update({ disabled });
        return { status: "success", message: "Stato utente aggiornato con successo." };
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Funzione per eliminare un utente.
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.ruolo !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono eliminare gli utenti.");
    }
    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError("invalid-argument", "L'UID dell'utente è obbligatorio.");
    }
    try {
        await admin.auth().deleteUser(uid);
        await admin.firestore().collection("utenti_master").doc(uid).delete();
        return { status: "success", message: "Utente eliminato con successo." };
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});
//# sourceMappingURL=index.js.map