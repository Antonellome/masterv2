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
exports.getMasterData = exports.manageAccess = exports.setAdminClaim = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
try {
    admin.initializeApp();
}
catch (e) {
    firebase_functions_1.logger.info("L'app di admin è già inizializzata.");
}
const db = admin.firestore();
const auth = admin.auth();
const fetchCollection = async (collectionName) => {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
};
exports.setAdminClaim = (0, firestore_1.onDocumentCreated)({
    document: "amministratori/{uid}",
    region: "europe-west1",
}, async (event) => {
    const { uid } = event.params;
    const snapshot = event.data;
    if (!snapshot) {
        firebase_functions_1.logger.warn(`Evento di creazione per 'amministratori/${uid}' senza dati. Uscita.`);
        return;
    }
    firebase_functions_1.logger.info(`Tentativo di impostare il claim 'admin' per l'utente ${uid}`);
    try {
        await auth.setCustomUserClaims(uid, { role: 'admin' });
        firebase_functions_1.logger.info(`Successo! Il claim 'admin' è stato impostato per l'utente ${uid}.`);
        await db.collection('amministratori').doc(uid).update({
            claimImpostato: true,
            dataImpostazione: admin.firestore.FieldValue.serverTimestamp()
        });
        return { message: `Claim 'admin' impostato per l'utente ${uid}` };
    }
    catch (error) {
        firebase_functions_1.logger.error(`ERRORE nell'impostare il claim 'admin' per l'utente ${uid}:`, error);
        const errorMessage = (error instanceof Error) ? error.message : "Errore sconosciuto";
        await db.collection('amministratori').doc(uid).update({
            erroreClaim: true,
            messaggioErrore: errorMessage
        });
        return { error: errorMessage };
    }
});
exports.manageAccess = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) || request.auth.token.role !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "Azione non autorizzata. Solo gli amministratori possono eseguire questa operazione.");
    }
    const { action, payload } = request.data;
    switch (action) {
        case 'createAdmin': {
            if (!payload || !payload.email || !payload.nome) {
                throw new https_1.HttpsError('invalid-argument', "Dati mancanti: richiesti 'email' e 'nome'.");
            }
            const { email, nome } = payload;
            try {
                let userRecord;
                try {
                    userRecord = await auth.getUserByEmail(email);
                    firebase_functions_1.logger.info(`Utente ${email} trovato (UID: ${userRecord.uid}). Procedo con la promozione.`);
                }
                catch (error) {
                    if (error.code === 'auth/user-not-found') {
                        firebase_functions_1.logger.info(`Utente ${email} non trovato. Procedo con la creazione.`);
                        userRecord = await auth.createUser({ email, emailVerified: false, disabled: false });
                        firebase_functions_1.logger.info(`Utente ${email} creato con UID: ${userRecord.uid}.`);
                    }
                    else {
                        throw error;
                    }
                }
                const adminDocRef = db.collection('amministratori').doc(userRecord.uid);
                const adminDoc = await adminDocRef.get();
                if (adminDoc.exists) {
                    firebase_functions_1.logger.warn(`Il documento amministratore per UID ${userRecord.uid} esiste già.`);
                }
                else {
                    await adminDocRef.set({
                        nome: nome,
                        email: email,
                        ruolo: 'admin',
                        abilitato: true,
                        dataCreazione: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                firebase_functions_1.logger.info(`Documento amministratore per ${nome} (${email}) creato/verificato.`);
                return { success: true, message: `Privilegi di amministratore concessi a ${nome}.` };
            }
            catch (error) {
                firebase_functions_1.logger.error(`Errore durante la concessione dei privilegi a ${email}:`, error);
                throw new https_1.HttpsError("internal", `Impossibile concedere i privilegi: ${error.message}`);
            }
        }
        case 'toggleAbilitato': {
            if (!payload || !payload.uid || typeof payload.abilitato !== 'boolean') {
                throw new https_1.HttpsError('invalid-argument', "Dati mancanti o non validi. Richiesto 'uid' e 'abilitato'.");
            }
            const { uid, abilitato } = payload;
            try {
                await auth.updateUser(uid, { disabled: !abilitato });
                firebase_functions_1.logger.info(`Stato AUTH per l'utente ${uid} aggiornato a: ${abilitato ? 'abilitato' : 'disabilitato'}.`);
                // SOLUZIONE DEFINITIVA: Uso .set con { merge: true } per creare il documento se non esiste.
                await db.collection('tecnici').doc(uid).set({ abilitato: abilitato }, { merge: true });
                firebase_functions_1.logger.info(`Documento Firestore per tecnico ${uid} aggiornato/creato con stato: ${abilitato}.`);
                return { success: true, message: `Stato tecnico ${uid} aggiornato con successo.` };
            }
            catch (error) {
                firebase_functions_1.logger.error(`Errore durante l'aggiornamento dello stato per il tecnico ${uid}:`, error);
                throw new https_1.HttpsError("internal", `Impossibile aggiornare lo stato dell'utente: ${error.message}`);
            }
        }
        default: {
            throw new https_1.HttpsError("unimplemented", `L'azione '${action}' non è supportata da manageAccess.`);
        }
    }
});
exports.getMasterData = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role)) {
        throw new https_1.HttpsError("permission-denied", "Autenticazione richiesta per leggere i dati.");
    }
    if (request.auth.token.role !== 'admin' && request.auth.token.role !== 'tecnico') {
        throw new https_1.HttpsError("permission-denied", "Permessi insufficienti. Solo un amministratore o un tecnico può leggere i dati anagrafici.");
    }
    try {
        const collectionsToFetch = ['clienti', 'ditte', 'navi', 'luoghi', 'categorie', 'tipi-giornata', 'tecnici', 'veicoli'];
        const results = await Promise.all(collectionsToFetch.map(fetchCollection));
        const allData = {};
        collectionsToFetch.forEach((name, index) => { allData[name] = results[index]; });
        return allData;
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore critico durante il recupero dei dati anagrafici:", error);
        throw new https_1.HttpsError("internal", "Impossibile recuperare i dati anagrafici.");
    }
});
//# sourceMappingURL=index.js.map