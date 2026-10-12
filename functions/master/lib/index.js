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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotificationBatch = exports.master_inviaNotifichePush = exports.master_gestisciRapportino = exports.master_gestisciAnagrafica = exports.amministrazione_gestisciUtenti = exports.admin_getAllUsers = exports.master_resetPasswordTecnico = exports.master_gestisciTecnico = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const europeWest6Options = {
    region: "europe-west6",
};
exports.master_gestisciTecnico = (0, https_1.onCall)(europeWest6Options, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { operation, data: payload } = request.data;
    try {
        switch (operation) {
            case 'create': {
                const { email, password, displayName } = payload, otherData = __rest(payload, ["email", "password", "displayName"]);
                if (!email || !password) {
                    throw new https_1.HttpsError('invalid-argument', 'Email e password sono obbligatori.');
                }
                const userRecord = await admin.auth().createUser({
                    email,
                    password,
                    displayName: displayName || email,
                    emailVerified: true,
                    disabled: false,
                });
                logger.info(`Nuovo utente Auth creato con UID: ${userRecord.uid}`);
                const newTecnicoData = Object.assign(Object.assign({}, otherData), { uid: userRecord.uid, email, displayName: displayName || email, attivo: true, appAccess: true, createdAt: admin.firestore.FieldValue.serverTimestamp() });
                const docRef = db.collection('tecnici').doc(userRecord.uid);
                await docRef.set(newTecnicoData);
                logger.info(`Documento tecnico creato in Firestore con ID: ${userRecord.uid}`);
                return { success: true, id: userRecord.uid };
            }
            case 'update': {
                const { id, uid } = payload, updateData = __rest(payload, ["id", "uid"]);
                if (!id || !uid) {
                    throw new https_1.HttpsError('invalid-argument', 'ID documento e UID sono obbligatori.');
                }
                const { email, displayName } = updateData;
                await admin.auth().updateUser(uid, { email, displayName });
                logger.info(`Dati Auth del tecnico ${uid} aggiornati.`);
                const docRef = db.collection('tecnici').doc(id);
                const firestoreUpdateData = Object.assign(Object.assign({}, updateData), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                await docRef.update(firestoreUpdateData);
                logger.info(`Documento Firestore ${id} aggiornato.`);
                return { success: true, message: `Tecnico ${uid} aggiornato` };
            }
            case 'toggle-active': {
                const { id, attivo } = payload;
                if (!id) {
                    throw new https_1.HttpsError('invalid-argument', 'UID del tecnico mancante.');
                }
                await admin.auth().updateUser(id, { disabled: !attivo });
                const docRef = db.collection('tecnici').doc(id);
                await docRef.update({ attivo, appAccess: attivo });
                logger.info(`Stato di attivazione del tecnico ${id} impostato a ${attivo}.`);
                return { success: true, message: `Stato utente ${id} aggiornato` };
            }
            default:
                throw new https_1.HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
        }
    }
    catch (error) {
        logger.error(`ERRORE FATALE in master_gestisciTecnico, op: '${operation}': ${JSON.stringify(error)}`);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message, error);
    }
});
exports.master_resetPasswordTecnico = (0, https_1.onCall)(europeWest6Options, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { email } = request.data;
    if (!email) {
        throw new https_1.HttpsError('invalid-argument', "L'indirizzo email è obbligatorio.");
    }
    try {
        await admin.auth().generatePasswordResetLink(email);
        logger.info(`Link di reset password inviato a ${email}.`);
        return { success: true };
    }
    catch (error) {
        logger.error(`Errore durante la generazione del link di reset per ${email}: ${JSON.stringify(error)}`);
        if (error.code === 'auth/user-not-found') {
            throw new https_1.HttpsError('not-found', 'Nessun utente trovato con questa email.');
        }
        throw new https_1.HttpsError('internal', "Errore durante l'invio dell'email di reset.");
    }
});
exports.admin_getAllUsers = (0, https_1.onCall)(europeWest6Options, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { pageToken, maxResults = 100 } = request.data;
    try {
        const userRecords = await admin.auth().listUsers(maxResults, pageToken);
        const users = userRecords.users.map(u => ({ uid: u.uid, email: u.email, displayName: u.displayName, disabled: u.disabled, customClaims: u.customClaims }));
        return { success: true, users, nextPageToken: userRecords.pageToken };
    }
    catch (error) {
        logger.error(`Errore durante il recupero degli utenti: ${JSON.stringify(error)}`);
        throw new https_1.HttpsError('internal', "Impossibile recuperare l'elenco degli utenti.");
    }
});
exports.amministrazione_gestisciUtenti = (0, https_1.onCall)(europeWest6Options, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { operation } = request.data;
    try {
        switch (operation) {
            case 'create':
            case 'update':
            case 'delete':
                throw new https_1.HttpsError('unimplemented', `L'operazione '${operation}' non è ancora stata implementata.`);
            default:
                throw new https_1.HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
        }
    }
    catch (error) {
        logger.error(`Errore in amministrazione_gestisciUtenti, op: '${operation}': ${JSON.stringify(error)}`);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Errore interno del server.');
    }
});
exports.master_gestisciAnagrafica = (0, https_1.onCall)(europeWest6Options, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { operation, data: payload, anagraficaId } = request.data;
    try {
        const anagraficaRef = db.collection('anagrafiche');
        switch (operation) {
            case 'create': {
                const docRef = await anagraficaRef.add(Object.assign(Object.assign({}, payload), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
                return { success: true, id: docRef.id };
            }
            case 'update': {
                if (!anagraficaId)
                    throw new https_1.HttpsError('invalid-argument', 'anagraficaId mancante.');
                await anagraficaRef.doc(anagraficaId).update(Object.assign(Object.assign({}, payload), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
                return { success: true, id: anagraficaId };
            }
            case 'delete': {
                if (!anagraficaId)
                    throw new https_1.HttpsError('invalid-argument', 'anagraficaId mancante.');
                await anagraficaRef.doc(anagraficaId).delete();
                return { success: true, id: anagraficaId };
            }
            default:
                throw new https_1.HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
        }
    }
    catch (error) {
        logger.error(`Errore in master_gestisciAnagrafica, op: '${operation}': ${JSON.stringify(error)}`);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Errore interno del server.');
    }
});
exports.master_gestisciRapportino = (0, https_1.onCall)(europeWest6Options, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { operation } = request.data;
    try {
        switch (operation) {
            case 'create':
            case 'update':
            case 'delete':
                throw new https_1.HttpsError('unimplemented', `L'operazione '${operation}' non è ancora stata implementata.`);
            default:
                throw new https_1.HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
        }
    }
    catch (error) {
        logger.error(`Errore in master_gestisciRapportino, op: '${operation}': ${JSON.stringify(error)}`);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Errore interno del server.');
    }
});
exports.master_inviaNotifichePush = (0, https_1.onCall)(europeWest6Options, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { token, topic, title, body, data } = request.data.notification;
    if (!title || !body || (!token && !topic)) {
        throw new https_1.HttpsError('invalid-argument', 'token/topic, titolo e body sono obbligatori.');
    }
    const payload = Object.assign({ notification: { title, body }, data: data || {} }, (token ? { token } : { topic: topic }));
    try {
        const response = await admin.messaging().send(payload);
        logger.info(`Notifica inviata con successo: ${response}`);
        return { success: true, messageId: response };
    }
    catch (error) {
        logger.error(`Errore durante l'invio della notifica: ${JSON.stringify(error)}`);
        throw new https_1.HttpsError('internal', "Impossibile inviare la notifica.");
    }
});
exports.deleteNotificationBatch = (0, https_1.onCall)(europeWest6Options, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { collectionName, docIds } = request.data;
    if (!collectionName || !Array.isArray(docIds) || docIds.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'collectionName e un array di docIds sono richiesti.');
    }
    const batch = db.batch();
    docIds.forEach(id => {
        const docRef = db.collection(collectionName).doc(id);
        batch.delete(docRef);
    });
    try {
        await batch.commit();
        logger.info(`Cancellati ${docIds.length} documenti da ${collectionName}.`);
        return { success: true };
    }
    catch (error) {
        logger.error(`Errore durante la cancellazione batch: ${JSON.stringify(error)}`);
        throw new https_1.HttpsError('internal', 'Impossibile completare la cancellazione batch.');
    }
});
//# sourceMappingURL=index.js.map