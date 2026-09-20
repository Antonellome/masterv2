"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificheAsRead = exports.getNotifiche = exports.saveFCMToken = exports.createCheckin = exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = exports.getCheckinsUpdates = exports.getAllRapportiniForSync = exports.syncAllAnagrafiche = exports.sync_manifest = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
(0, v2_1.setGlobalOptions)({ region: "europe-west6" });
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
    const collectionsToSync = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    const allData = {};
    const promises = collectionsToSync.map(async (coll) => {
        const snapshot = await db.collection(coll).get();
        allData[coll] = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    });
    await Promise.all(promises);
    return allData;
});
exports.getAllRapportiniForSync = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const { lastSyncTimestamp = 0, tecnicoId } = request.data;
    if (!tecnicoId) {
        throw new https_1.HttpsError("invalid-argument", "ID tecnico non valido.");
    }
    if (request.auth.uid !== tecnicoId) {
        throw new https_1.HttpsError("permission-denied", "Non puoi sincronizzare i rapportini di un altro utente.");
    }
    let query = db.collection("rapportini").where("presenze", "array-contains", tecnicoId);
    if (lastSyncTimestamp > 0) {
        query = query.where("updatedAt", ">", new Date(lastSyncTimestamp));
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => (Object.assign(Object.assign({}, doc.data()), { id: doc.id })));
});
exports.getCheckinsUpdates = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid)
        throw new https_1.HttpsError("permission-denied", "ID tecnico non valido.");
    let query = db.collection("checkin_giornalieri")
        .where("tecnicoId", "==", tecnicoId)
        .where("timestampReale", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => (Object.assign(Object.assign({}, doc.data()), { id: doc.id }))) };
});
exports.createRapportino = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.rapportinoData)
        throw new https_1.HttpsError("invalid-argument", "Dati del rapportino mancanti.");
    const { rapportinoData } = request.data;
    const newRapportinoRef = db.collection("rapportini").doc();
    await newRapportinoRef.set(Object.assign(Object.assign({}, rapportinoData), { id: newRapportinoRef.id, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp(), isDeleted: false }));
    return { id: newRapportinoRef.id };
});
exports.updateRapportino = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.id || !request.data.rapportinoData)
        throw new https_1.HttpsError("invalid-argument", "ID o dati del rapportino mancanti.");
    const { id, rapportinoData } = request.data;
    const rapportinoRef = db.collection("rapportini").doc(id);
    await rapportinoRef.update(Object.assign(Object.assign({}, rapportinoData), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
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
exports.createCheckin = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.checkinData)
        throw new https_1.HttpsError("invalid-argument", "Dati del check-in mancanti.");
    const { checkinData } = request.data;
    const newCheckinRef = db.collection("checkin_giornalieri").doc();
    await newCheckinRef.set(Object.assign(Object.assign({}, checkinData), { id: newCheckinRef.id, timestampReale: firestore_1.FieldValue.serverTimestamp() }));
    return { id: newCheckinRef.id };
});
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
exports.getNotifiche = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const tecnicoId = request.auth.token.tecnicoId;
    if (!tecnicoId) {
        throw new https_1.HttpsError("failed-precondition", "Token utente incompleto.");
    }
    const snapshot = await db.collection("notifiche").where("tecnicoId", "==", tecnicoId).orderBy("createdAt", "desc").get();
    if (snapshot.empty)
        return [];
    return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
});
exports.markNotificheAsRead = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const ids = request.data.notificationIds;
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "È richiesto un array di ID.");
    }
    const batch = db.batch();
    ids.forEach(id => {
        batch.update(db.collection("notifiche").doc(id), { isRead: true, letta: true });
    });
    await batch.commit();
    return { success: true };
});
//# sourceMappingURL=index.js.map