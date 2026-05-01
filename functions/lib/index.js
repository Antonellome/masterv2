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
exports.manageAccess = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
// Inizializzazione Globale
try {
    admin.initializeApp();
}
catch (e) {
    firebase_functions_1.logger.info("L'app di admin è già inizializzata.");
}
const db = admin.firestore();
const auth = admin.auth();
// =========================================================================
// === FUNZIONE DI GESTIONE ACCESSI ========================================
// =========================================================================
exports.manageAccess = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    var _a;
    const { action, payload } = request.data;
    const callingUid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!callingUid) {
        throw new https_1.HttpsError("unauthenticated", "Devi essere autenticato.");
    }
    if (!(await isUserAdmin(callingUid))) {
        throw new https_1.HttpsError("permission-denied", "Non hai i permessi per eseguire questa operazione.");
    }
    firebase_functions_1.logger.info(`Azione '${action}' richiesta da admin ${callingUid}`, { payload });
    try {
        switch (action) {
            case "createCandidate":
                return await createCandidate(payload);
            case "promoteToAdmin":
                return await promoteToAdmin(payload);
            case "demoteToCandidate":
                if (payload.uid === callingUid) {
                    throw new https_1.HttpsError("permission-denied", "Un amministratore non può revocare i propri privilegi.");
                }
                return await demoteToCandidate(payload);
            case "deleteUser":
                if (payload.uid === callingUid) {
                    throw new https_1.HttpsError("permission-denied", "Un amministratore non può eliminare il proprio account.");
                }
                return await deleteUser(payload, payload.fromCollection);
            default:
                throw new https_1.HttpsError("invalid-argument", "Azione non valida o non supportata.");
        }
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante l'azione '${action}':`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", `Errore interno durante l'esecuzione di '${action}'.`);
    }
});
// === LOGICA INTERNA DELLE AZIONI ===
async function createCandidate(payload) {
    const { email, nome } = payload;
    if (!email || !nome) {
        throw new https_1.HttpsError("invalid-argument", "Email e nome sono obbligatori.");
    }
    try {
        const user = await auth.getUserByEmail(email);
        const isAdmin = await db.collection("amministratori").doc(user.uid).get();
        const isCandidate = await db.collection("utenti_master").doc(user.uid).get();
        if (isAdmin.exists || isCandidate.exists) {
            throw new https_1.HttpsError("already-exists", "Un utente con questa email esiste già nel sistema.");
        }
    }
    catch (error) {
        if (error.code !== 'auth/user-not-found') {
            throw error;
        }
    }
    await db.collection("utenti_master").add({ nome, email, dataCreazione: admin.firestore.FieldValue.serverTimestamp() });
    return { status: "success", message: `Candidato ${nome} creato con successo.` };
}
async function promoteToAdmin(payload) {
    const { uid } = payload;
    if (!uid)
        throw new https_1.HttpsError("invalid-argument", "UID utente è obbligatorio.");
    const candidateRef = db.collection("utenti_master").doc(uid);
    const candidateDoc = await candidateRef.get();
    if (!candidateDoc.exists) {
        throw new https_1.HttpsError("not-found", "Candidato non trovato in utenti_master.");
    }
    const { nome, email } = candidateDoc.data();
    let user;
    try {
        user = await auth.getUserByEmail(email);
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            user = await auth.createUser({ email, emailVerified: false, displayName: nome, disabled: false });
        }
        else {
            throw new https_1.HttpsError("internal", `Errore Auth: ${error.message}`);
        }
    }
    const adminRef = db.collection("amministratori").doc(user.uid);
    await db.runTransaction(async (transaction) => {
        transaction.delete(candidateRef);
        transaction.set(adminRef, {
            nome,
            email,
            ruolo: 'admin',
            abilitato: true,
            dataCreazione: admin.firestore.FieldValue.serverTimestamp()
        });
    });
    await auth.setCustomUserClaims(user.uid, { admin: true });
    return { status: "success", message: `${nome} è stato promosso ad amministratore.` };
}
async function demoteToCandidate(payload) {
    const { uid } = payload;
    if (!uid)
        throw new https_1.HttpsError("invalid-argument", "UID utente è obbligatorio.");
    const adminRef = db.collection("amministratori").doc(uid);
    const adminDoc = await adminRef.get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("not-found", "Amministratore non trovato.");
    }
    const { nome, email } = adminDoc.data();
    const candidateRef = db.collection("utenti_master").doc(uid);
    await db.runTransaction(async (transaction) => {
        transaction.delete(adminRef);
        transaction.set(candidateRef, { nome, email, dataCreazione: admin.firestore.FieldValue.serverTimestamp() });
    });
    await auth.setCustomUserClaims(uid, { admin: false });
    return { status: "success", message: `Amministratore ${nome} revocato a candidato.` };
}
async function deleteUser(payload, fromCollection) {
    const { uid } = payload;
    if (!uid)
        throw new https_1.HttpsError("invalid-argument", "UID utente è obbligatorio.");
    if (!['amministratori', 'utenti_master'].includes(fromCollection)) {
        throw new https_1.HttpsError("invalid-argument", "Collezione di origine non valida.");
    }
    await db.collection(fromCollection).doc(uid).delete();
    try {
        await auth.updateUser(uid, { disabled: true });
        await auth.setCustomUserClaims(uid, null);
    }
    catch (error) {
        firebase_functions_1.logger.warn(`L'utente ${uid} era in Firestore ma non in Auth. Pulizia completata.`);
    }
    return { status: "success", message: "Utente eliminato con successo." };
}
// === FUNZIONE HELPER ===
async function isUserAdmin(uid) {
    const adminDoc = await db.collection("amministratori").doc(uid).get();
    return adminDoc.exists;
}
//# sourceMappingURL=index.js.map