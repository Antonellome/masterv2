"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testcors = exports.syncAnagrafica = exports.deleteDocumento = exports.updateDocumento = exports.createDocumento = exports.deleteNotifiche = exports.sendNotifica = exports.markNotificheAsRead = exports.getNotifiche = exports.adminGetAllRapportini = exports.saveFCMToken = exports.amministrazione_gestisciUtenti = exports.admin_getAllUsers = exports.getCheckinsUpdates = exports.createCheckin = exports.getAllRapportiniForSync = exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = exports.syncAllAnagrafiche = exports.sync_manifest = exports.master_gestisciAnagrafica = void 0;
const app_1 = require("firebase-admin/app");
// PRIMA AZIONE IN ASSOLUTO: Inizializzare l'app.
(0, app_1.initializeApp)();
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
// Import delle nuove funzioni per le notifiche
const notifiche_1 = require("./notifiche");
Object.defineProperty(exports, "getNotifiche", { enumerable: true, get: function () { return notifiche_1.getNotifiche; } });
Object.defineProperty(exports, "markNotificheAsRead", { enumerable: true, get: function () { return notifiche_1.markNotificheAsRead; } });
Object.defineProperty(exports, "sendNotifica", { enumerable: true, get: function () { return notifiche_1.sendNotifica; } });
Object.defineProperty(exports, "deleteNotifiche", { enumerable: true, get: function () { return notifiche_1.deleteNotifiche; } });
// CORREZIONE: Rimosso blocco 'cors' non valido da setGlobalOptions.
(0, v2_1.setGlobalOptions)({
    region: "europe-west6", // Impostazione globale della region
});
// Inizializzazione spostata in cima al file.
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
//<--------------------------------- FUNZIONI MASTER (Nuova Architettura) --------------------------------->
exports.master_gestisciAnagrafica = (0, https_1.onCall)(async (request) => {
    // 1. Sicurezza: Verifica autenticazione e ruolo di amministratore
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta per questa operazione.");
    }
    await checkAdmin(request.auth.uid);
    // 2. Validazione dell'input
    const { collectionName, operation, data } = request.data;
    if (!collectionName || !operation || !data) {
        throw new https_1.HttpsError("invalid-argument", "Payload incompleto. Sono richiesti 'collectionName', 'operation' e 'data'.");
    }
    // 3. Whitelist delle collezioni gestibili
    const allowedCollections = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche"];
    // La collezione 'tecnici' è esclusa perché avrà una gestione dedicata più complessa.
    if (!allowedCollections.includes(collectionName)) {
        throw new https_1.HttpsError("invalid-argument", `La collezione '${collectionName}' non è gestibile tramite questa funzione.`);
    }
    const collectionRef = db.collection(collectionName);
    logger.info(`[master_gestisciAnagrafica] Eseguo operazione '${operation}' su '${collectionName}' per utente admin '${request.auth.uid}'`, { data });
    // 4. Esecuzione dell'operazione
    try {
        switch (operation) {
            case 'create': {
                if (data.id) { // Se un ID è già presente (es. da crypto.randomUUID()), lo uso
                    const newDocRef = collectionRef.doc(data.id);
                    await newDocRef.set(data);
                    return { success: true, id: data.id };
                }
                else { // Altrimenti, lascio che Firestore generi l'ID
                    const newDocRef = collectionRef.doc();
                    await newDocRef.set({ ...data, id: newDocRef.id });
                    return { success: true, id: newDocRef.id };
                }
            }
            case 'update': {
                if (!data.id) {
                    throw new https_1.HttpsError("invalid-argument", "ID del documento mancante per l'operazione di 'update'.");
                }
                const { id, ...updateData } = data;
                const docRef = collectionRef.doc(id);
                await docRef.update(updateData);
                return { success: true, id };
            }
            case 'delete': {
                if (!data.id) {
                    throw new https_1.HttpsError("invalid-argument", "ID del documento mancante per l'operazione di 'delete'.");
                }
                await collectionRef.doc(data.id).delete();
                return { success: true, id: data.id };
            }
            default:
                throw new https_1.HttpsError("invalid-argument", `Operazione '${operation}' non supportata.`);
        }
    }
    catch (error) {
        logger.error(`[master_gestisciAnagrafica] Errore durante l'operazione '${operation}' su '${collectionName}'`, error);
        // Controlla se error è un'istanza di Error per accedere a .message
        const errorMessage = error instanceof Error ? error.message : "Errore interno del server.";
        throw new https_1.HttpsError("internal", `Impossibile completare l'operazione: ${errorMessage}`, error);
    }
});
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
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    try {
        logger.info(`[syncAllAnagrafiche] Chiamata ricevuta. Payload: ${JSON.stringify(request.data)}`);
        const collectionsToSync = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
        const allData = {}; // Tipo piu specifico per 'any'
        const promises = collectionsToSync.map(async (coll) => {
            const snapshot = await db.collection(coll).get();
            allData[coll] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        await Promise.all(promises);
        return allData;
    }
    catch (error) {
        logger.error("ERRORE in syncAllAnagrafiche:", error);
        throw new https_1.HttpsError("internal", "Impossibile completare la sincronizzazione delle anagrafiche.", error);
    }
});
exports.createRapportino = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.rapportinoData)
        throw new https_1.HttpsError("invalid-argument", "Dati del rapportino mancanti.");
    const { rapportinoData } = request.data;
    const newRapportinoRef = db.collection("rapportini").doc();
    await newRapportinoRef.set({ ...rapportinoData, id: newRapportinoRef.id, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp(), isDeleted: false });
    return { id: newRapportinoRef.id };
});
exports.updateRapportino = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.id || !request.data.rapportinoData)
        throw new https_1.HttpsError("invalid-argument", "ID o dati del rapportino mancanti.");
    const { id, rapportinoData } = request.data;
    const rapportinoRef = db.collection("rapportini").doc(id);
    await rapportinoRef.update({ ...rapportinoData, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    return { success: true };
});
exports.deleteRapportino = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.id)
        throw new https_1.HttpsError("invalid-argument", "ID del rapportino mancante.");
    const { id } = request.data;
    await db.collection("rapportini").doc(id).update({ isDeleted: true, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    return { success: true };
});
// ================== BUG FIX APPLICATO (Versione da comunicazione.md) ==================
exports.getAllRapportiniForSync = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid)
        throw new https_1.HttpsError("permission-denied", "ID tecnico non valido.");
    // CORREZIONE: La query ora funziona correttamente anche per la prima sincronizzazione (lastSyncTimestamp = 0).
    let query = db.collection("rapportini")
        .where("presenze", "array-contains", tecnicoId)
        .where("updatedAt", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});
// ====================================================================================
exports.createCheckin = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.checkinData)
        throw new https_1.HttpsError("invalid-argument", "Dati del check-in mancanti.");
    const { checkinData } = request.data;
    const newCheckinRef = db.collection("checkin_giornalieri").doc();
    await newCheckinRef.set({ ...checkinData, id: newCheckinRef.id, timestampReale: firestore_1.FieldValue.serverTimestamp() });
    return { id: newCheckinRef.id };
});
// ================== BUG FIX APPLICATO (Versione da comunicazione.md) ==================
exports.getCheckinsUpdates = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid)
        throw new https_1.HttpsError("permission-denied", "ID tecnico non valido.");
    // CORREZIONE: La query ora funziona correttamente anche per la prima sincronizzazione (lastSyncTimestamp = 0).
    let query = db.collection("checkin_giornalieri")
        .where("tecnicoId", "==", tecnicoId)
        .where("timestampReale", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});
// ====================================================================================
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
    if (!request.data || !request.data.action || !request.data.payload)
        throw new https_1.HttpsError("invalid-argument", "Azione o payload mancanti.");
    const { action, payload } = request.data;
    switch (action) {
        case 'createUser': {
            const { email, password, displayName } = payload;
            const userRecord = await auth.createUser({ email, password, displayName });
            await auth.setCustomUserClaims(userRecord.uid, { admin: false });
            return { success: true, uid: userRecord.uid };
        }
        case 'updateUser': {
            const { uid, ...updateData } = payload;
            await auth.updateUser(uid, updateData);
            return { success: true };
        }
        case 'deleteUser': {
            await auth.deleteUser(payload.uid);
            return { success: true };
        }
        case 'toggleRole': {
            const { targetUid, isAdmin } = payload;
            await auth.setCustomUserClaims(targetUid, { admin: isAdmin });
            return { success: true };
        }
        default:
            throw new https_1.HttpsError("invalid-argument", `Azione '${action}' non riconosciuta.`);
    }
});
//<--------------------------------- FUNZIONI VARIE --------------------------------->
exports.saveFCMToken = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.token)
        throw new https_1.HttpsError("invalid-argument", "Token FCM mancante.");
    const { token } = request.data;
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
//<--------------------------------- FUNZIONI SINCRONIZZAZIONE OFFLINE (Legacy) --------------------------------->
exports.createDocumento = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Richiesta autenticazione.");
    if (!request.data || !request.data.data)
        throw new https_1.HttpsError("invalid-argument", "Dati mancanti.");
    const { data } = request.data;
    const docRef = db.collection('documenti').doc();
    await docRef.set({ ...data, id: docRef.id, createdAt: firestore_1.FieldValue.serverTimestamp() });
    return { id: docRef.id };
});
exports.updateDocumento = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Richiesta autenticazione.");
    if (!request.data || !request.data.id || !request.data.data)
        throw new https_1.HttpsError("invalid-argument", "ID o dati mancanti.");
    const { id, data } = request.data;
    await db.collection('documenti').doc(id).update({ ...data, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    return { success: true };
});
exports.deleteDocumento = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Richiesta autenticazione.");
    if (!request.data || !request.data.id)
        throw new https_1.HttpsError("invalid-argument", "ID mancante.");
    const { id } = request.data;
    await db.collection('documenti').doc(id).delete();
    return { success: true };
});
exports.syncAnagrafica = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.collectionName || !request.data.operation || !request.data.data)
        throw new https_1.HttpsError("invalid-argument", "Dati obbligatori mancanti.");
    const { collectionName, operation, data } = request.data;
    const allowedCollections = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    if (!allowedCollections.includes(collectionName))
        throw new https_1.HttpsError("invalid-argument", `Collezione '${collectionName}' non valida.`);
    const collectionRef = db.collection(collectionName);
    const versionRef = db.collection(collectionName).doc('version');
    switch (operation) {
        case 'create': {
            const newDocRef = collectionRef.doc();
            await newDocRef.set({ ...data, id: newDocRef.id });
            await versionRef.set({ number: firestore_1.FieldValue.increment(1) }, { merge: true });
            return { success: true, id: newDocRef.id };
        }
        case 'update': {
            if (!data.id)
                throw new https_1.HttpsError("invalid-argument", "ID mancante per l'update.");
            const docRef = collectionRef.doc(data.id);
            await docRef.update(data);
            await versionRef.set({ number: firestore_1.FieldValue.increment(1) }, { merge: true });
            return { success: true };
        }
        case 'delete': {
            if (!data.id)
                throw new https_1.HttpsError("invalid-argument", "ID mancante per il delete.");
            await collectionRef.doc(data.id).delete();
            await versionRef.set({ number: firestore_1.FieldValue.increment(1) }, { merge: true });
            return { success: true };
        }
        default:
            throw new https_1.HttpsError("invalid-argument", `Operazione '${operation}' non supportata.`);
    }
});
//<--------------------------------- TEST CORS --------------------------------->
exports.testcors = (0, https_1.onRequest)((request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.set("Access-control-Allow-Headers", "Content-Type, Authorization");
    if (request.method === "OPTIONS") {
        response.status(204).send("");
        return;
    }
    logger.info("Test CORS eseguito con successo");
    response.status(200).json({ message: "La funzione testcors e' operativa." });
});
//# sourceMappingURL=index.js.map