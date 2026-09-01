"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testcors = exports.syncAnagrafica = exports.deleteDocumento = exports.updateDocumento = exports.createDocumento = exports.adminGetAllRapportini = exports.saveFCMToken = exports.amministrazione_gestisciUtenti = exports.admin_getAllUsers = exports.getCheckinsUpdates = exports.createCheckin = exports.getAllRapportiniForSync = exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = exports.syncAllAnagrafiche = exports.sync_manifest = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
// Aggiungo @ts-ignore per forzare la compilazione nonostante l'errore sulla proprieta' 'cors'.
// @ts-ignore
(0, v2_1.setGlobalOptions)({
    region: "europe-west6",
    cors: {
        origin: "*",
        methods: "GET,POST,PUT,DELETE,OPTIONS",
        allowedHeaders: "Content-Type,Authorization",
    },
});
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
// Funzione helper per verificare se l'utente chiamante è un amministratore.
const checkAdmin = async (uid) => {
    const user = await auth.getUser(uid);
    if (user.customClaims?.['admin'] !== true) {
        logger.warn("Tentativo di accesso non autorizzato da:", uid);
        throw new https_1.HttpsError("permission-denied", "Operazione consentita solo agli amministratori.");
    }
};
//<--------------------------------- FUNZIONI CORE (App Tecnici) --------------------------------->
exports.sync_manifest = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const collections = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    const manifest = {};
    const now = Date.now();
    for (const collName of collections) {
        manifest[collName] = now;
    }
    return manifest;
});
exports.syncAllAnagrafiche = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const collectionsToSync = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    const allData = {};
    const promises = collectionsToSync.map(async (coll) => {
        const snapshot = await db.collection(coll).get();
        allData[coll] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
    await Promise.all(promises);
    return allData;
});
exports.createRapportino = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { rapportinoData } = request.data;
    if (!rapportinoData)
        throw new https_1.HttpsError("invalid-argument", "Dati del rapportino mancanti.");
    const newRapportinoRef = db.collection("rapportini").doc();
    await newRapportinoRef.set({ ...rapportinoData, id: newRapportinoRef.id, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp(), isDeleted: false });
    return { id: newRapportinoRef.id };
});
exports.updateRapportino = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { id, rapportinoData } = request.data;
    if (!id || !rapportinoData)
        throw new https_1.HttpsError("invalid-argument", "ID o dati del rapportino mancanti.");
    const rapportinoRef = db.collection("rapportini").doc(id);
    await rapportinoRef.update({ ...rapportinoData, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    return { success: true };
});
exports.deleteRapportino = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { id } = request.data;
    if (!id)
        throw new https_1.HttpsError("invalid-argument", "ID del rapportino mancante.");
    await db.collection("rapportini").doc(id).update({ isDeleted: true, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    return { success: true };
});
exports.getAllRapportiniForSync = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    let query = db.collection("rapportini").where("presenze", "array-contains", tecnicoId);
    if (lastSyncTimestamp > 0)
        query = query.where("updatedAt", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});
exports.createCheckin = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { checkinData } = request.data;
    if (!checkinData)
        throw new https_1.HttpsError("invalid-argument", "Dati del check-in mancanti.");
    const newCheckinRef = db.collection("checkin_giornalieri").doc();
    await newCheckinRef.set({ ...checkinData, id: newCheckinRef.id, timestampReale: firestore_1.FieldValue.serverTimestamp() });
    return { id: newCheckinRef.id };
});
exports.getCheckinsUpdates = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    let query = db.collection("checkin_giornalieri").where("tecnicoId", "==", tecnicoId);
    if (lastSyncTimestamp > 0)
        query = query.where("timestampReale", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});
//<--------------------------------- FUNZIONI DI AMMINISTRAZIONE --------------------------------->
exports.admin_getAllUsers = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    await checkAdmin(request.auth.uid);
    const listUsersResult = await auth.listUsers();
    return listUsersResult.users.map((userRecord) => ({
        uid: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName,
        disabled: userRecord.disabled, isAdmin: userRecord.customClaims?.['admin'] === true,
    }));
});
exports.amministrazione_gestisciUtenti = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    await checkAdmin(request.auth.uid);
    const { action, payload } = request.data;
    if (!action || !payload)
        throw new https_1.HttpsError("invalid-argument", "Azione o payload mancanti.");
    switch (action) {
        case 'createUser':
            const { email, password, displayName } = payload;
            const userRecord = await auth.createUser({ email, password, displayName });
            await auth.setCustomUserClaims(userRecord.uid, { admin: false });
            return { success: true, uid: userRecord.uid };
        case 'updateUser':
            const { uid, ...updateData } = payload;
            await auth.updateUser(uid, updateData);
            return { success: true };
        case 'deleteUser':
            await auth.deleteUser(payload.uid);
            return { success: true };
        case 'toggleRole':
            const { targetUid, isAdmin } = payload;
            await auth.setCustomUserClaims(targetUid, { admin: isAdmin });
            return { success: true };
        default:
            throw new https_1.HttpsError("invalid-argument", `Azione '${action}' non riconosciuta.`);
    }
});
//<--------------------------------- FUNZIONI VARIE --------------------------------->
exports.saveFCMToken = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { token } = request.data;
    if (!token)
        throw new https_1.HttpsError("invalid-argument", "Token FCM mancante.");
    const tokenRef = db.collection("fcmTokens").doc(request.auth.uid);
    await tokenRef.set({ token, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    return { success: true };
});
exports.adminGetAllRapportini = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    await checkAdmin(request.auth.uid);
    const { filters } = request.data;
    let query = db.collection("rapportini");
    if (filters?.dataInizio)
        query = query.where("data", ">=", new Date(filters.dataInizio));
    if (filters?.dataFine)
        query = query.where("data", "<=", new Date(filters.dataFine));
    if (filters?.idTecnico)
        query = query.where("idTecnico", "==", filters.idTecnico);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});
//<--------------------------------- FUNZIONI SINCRONIZZAZIONE OFFLINE --------------------------------->
exports.createDocumento = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Richiesta autenticazione.");
    const { data } = request.data;
    if (!data)
        throw new https_1.HttpsError("invalid-argument", "Dati mancanti.");
    const docRef = db.collection('documenti').doc();
    await docRef.set({ ...data, id: docRef.id, createdAt: firestore_1.FieldValue.serverTimestamp() });
    return { id: docRef.id };
});
exports.updateDocumento = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Richiesta autenticazione.");
    const { id, data } = request.data;
    if (!id || !data)
        throw new https_1.HttpsError("invalid-argument", "ID o dati mancanti.");
    await db.collection('documenti').doc(id).update({ ...data, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    return { success: true };
});
exports.deleteDocumento = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Richiesta autenticazione.");
    const { id } = request.data;
    if (!id)
        throw new https_1.HttpsError("invalid-argument", "ID mancante.");
    await db.collection('documenti').doc(id).delete();
    return { success: true };
});
exports.syncAnagrafica = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { collectionName, operation, data } = request.data;
    if (!collectionName || !operation || !data)
        throw new https_1.HttpsError("invalid-argument", "Dati obbligatori mancanti.");
    const allowedCollections = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    if (!allowedCollections.includes(collectionName))
        throw new https_1.HttpsError("invalid-argument", `Collezione '${collectionName}' non valida.`);
    const collectionRef = db.collection(collectionName);
    const versionRef = db.collection(collectionName).doc('version');
    switch (operation) {
        case 'create':
            const newDocRef = collectionRef.doc();
            await newDocRef.set({ ...data, id: newDocRef.id });
            await versionRef.set({ number: firestore_1.FieldValue.increment(1) }, { merge: true });
            return { success: true, id: newDocRef.id };
        case 'update':
            if (!data.id)
                throw new https_1.HttpsError("invalid-argument", "ID mancante per l'update.");
            const docRef = collectionRef.doc(data.id);
            await docRef.update(data);
            await versionRef.set({ number: firestore_1.FieldValue.increment(1) }, { merge: true });
            return { success: true };
        case 'delete':
            if (!data.id)
                throw new https_1.HttpsError("invalid-argument", "ID mancante per il delete.");
            await collectionRef.doc(data.id).delete();
            await versionRef.set({ number: firestore_1.FieldValue.increment(1) }, { merge: true });
            return { success: true };
        default:
            throw new https_1.HttpsError("invalid-argument", `Operazione '${operation}' non supportata.`);
    }
});
//<--------------------------------- TEST CORS --------------------------------->
exports.testcors = (0, https_1.onRequest)((request, response) => {
    // Imposto manualmente gli header per questa funzione, ignorando setGlobalOptions
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    // Gestisco la richiesta pre-flight OPTIONS
    if (request.method === "OPTIONS") {
        response.status(204).send("");
        return;
    }
    // Per le richieste effettive, invio una risposta di successo.
    logger.info("Test CORS eseguito con successo!");
    response.status(200).json({ message: "CORS test successful!" });
});
//# sourceMappingURL=index.js.map