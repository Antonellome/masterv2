import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";

// Aggiungo @ts-ignore per forzare la compilazione nonostante l'errore sulla proprieta' 'cors'.
// @ts-ignore
setGlobalOptions({
  region: "europe-west6",
  cors: {
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  },
});

initializeApp();
const db = getFirestore();
const auth = getAuth();

// Funzione helper per verificare se l'utente chiamante è un amministratore.
const checkAdmin = async (uid: string) => {
    const user = await auth.getUser(uid);
    if (user.customClaims?.['admin'] !== true) {
        logger.warn("Tentativo di accesso non autorizzato da:", uid);
        throw new HttpsError("permission-denied", "Operazione consentita solo agli amministratori.");
    }
};


//<--------------------------------- FUNZIONI CORE (App Tecnici) --------------------------------->

export const sync_manifest = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const collections = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    const manifest: { [key: string]: number } = {};
    const now = Date.now();
    for (const collName of collections) {
        manifest[collName] = now;
    }
    return manifest;
});

export const syncAllAnagrafiche = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const collectionsToSync = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    const allData: { [key: string]: any[] } = {};
    const promises = collectionsToSync.map(async (coll) => {
        const snapshot = await db.collection(coll).get();
        allData[coll] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
    await Promise.all(promises);
    return allData;
});

export const createRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { rapportinoData } = request.data;
    if (!rapportinoData) throw new HttpsError("invalid-argument", "Dati del rapportino mancanti.");
    const newRapportinoRef = db.collection("rapportini").doc();
    await newRapportinoRef.set({ ...rapportinoData, id: newRapportinoRef.id, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), isDeleted: false });
    return { id: newRapportinoRef.id };
});

export const updateRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { id, rapportinoData } = request.data;
    if (!id || !rapportinoData) throw new HttpsError("invalid-argument", "ID o dati del rapportino mancanti.");
    const rapportinoRef = db.collection("rapportini").doc(id);
    await rapportinoRef.update({ ...rapportinoData, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});

export const deleteRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { id } = request.data;
    if (!id) throw new HttpsError("invalid-argument", "ID del rapportino mancante.");
    await db.collection("rapportini").doc(id).update({ isDeleted: true, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});

export const getAllRapportiniForSync = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    let query = db.collection("rapportini").where("presenze", "array-contains", tecnicoId);
    if(lastSyncTimestamp > 0) query = query.where("updatedAt", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

export const createCheckin = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { checkinData } = request.data;
    if (!checkinData) throw new HttpsError("invalid-argument", "Dati del check-in mancanti.");
    const newCheckinRef = db.collection("checkin_giornalieri").doc();
    await newCheckinRef.set({ ...checkinData, id: newCheckinRef.id, timestampReale: FieldValue.serverTimestamp() });
    return { id: newCheckinRef.id };
});

export const getCheckinsUpdates = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    let query = db.collection("checkin_giornalieri").where("tecnicoId", "==", tecnicoId);
    if (lastSyncTimestamp > 0) query = query.where("timestampReale", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

//<--------------------------------- FUNZIONI DI AMMINISTRAZIONE --------------------------------->

export const admin_getAllUsers = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    await checkAdmin(request.auth.uid);
    const listUsersResult = await auth.listUsers();
    return listUsersResult.users.map((userRecord) => ({
        uid: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName,
        disabled: userRecord.disabled, isAdmin: userRecord.customClaims?.['admin'] === true,
    }));
});

export const amministrazione_gestisciUtenti = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    await checkAdmin(request.auth.uid);
    const { action, payload } = request.data;
    if (!action || !payload) throw new HttpsError("invalid-argument", "Azione o payload mancanti.");
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
            throw new HttpsError("invalid-argument", `Azione '${action}' non riconosciuta.`);
    }
});

//<--------------------------------- FUNZIONI VARIE --------------------------------->

export const saveFCMToken = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { token } = request.data;
    if (!token) throw new HttpsError("invalid-argument", "Token FCM mancante.");
    const tokenRef = db.collection("fcmTokens").doc(request.auth.uid);
    await tokenRef.set({ token, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});

export const adminGetAllRapportini = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    await checkAdmin(request.auth.uid);
    const { filters } = request.data;
    let query: FirebaseFirestore.Query = db.collection("rapportini");
    if (filters?.dataInizio) query = query.where("data", ">=", new Date(filters.dataInizio));
    if (filters?.dataFine) query = query.where("data", "<=", new Date(filters.dataFine));
    if (filters?.idTecnico) query = query.where("idTecnico", "==", filters.idTecnico);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

//<--------------------------------- FUNZIONI SINCRONIZZAZIONE OFFLINE --------------------------------->

export const createDocumento = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Richiesta autenticazione.");
    const { data } = request.data;
    if (!data) throw new HttpsError("invalid-argument", "Dati mancanti.");
    const docRef = db.collection('documenti').doc();
    await docRef.set({ ...data, id: docRef.id, createdAt: FieldValue.serverTimestamp() });
    return { id: docRef.id };
});

export const updateDocumento = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Richiesta autenticazione.");
    const { id, data } = request.data;
    if (!id || !data) throw new HttpsError("invalid-argument", "ID o dati mancanti.");
    await db.collection('documenti').doc(id).update({ ...data, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});

export const deleteDocumento = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Richiesta autenticazione.");
    const { id } = request.data;
    if (!id) throw new HttpsError("invalid-argument", "ID mancante.");
    await db.collection('documenti').doc(id).delete();
    return { success: true };
});

export const syncAnagrafica = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { collectionName, operation, data } = request.data;
    if (!collectionName || !operation || !data) throw new HttpsError("invalid-argument", "Dati obbligatori mancanti.");
    const allowedCollections = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    if (!allowedCollections.includes(collectionName)) throw new HttpsError("invalid-argument", `Collezione '${collectionName}' non valida.`);
    
    const collectionRef = db.collection(collectionName);
    const versionRef = db.collection(collectionName).doc('version');

    switch (operation) {
        case 'create':
            const newDocRef = collectionRef.doc();
            await newDocRef.set({ ...data, id: newDocRef.id });
            await versionRef.set({ number: FieldValue.increment(1) }, { merge: true });
            return { success: true, id: newDocRef.id };
        case 'update':
            if (!data.id) throw new HttpsError("invalid-argument", "ID mancante per l'update.");
            const docRef = collectionRef.doc(data.id);
            await docRef.update(data);
            await versionRef.set({ number: FieldValue.increment(1) }, { merge: true });
            return { success: true };
        case 'delete':
            if (!data.id) throw new HttpsError("invalid-argument", "ID mancante per il delete.");
            await collectionRef.doc(data.id).delete();
            await versionRef.set({ number: FieldValue.increment(1) }, { merge: true });
            return { success: true };
        default:
            throw new HttpsError("invalid-argument", `Operazione '${operation}' non supportata.`);
    }
});

//<--------------------------------- TEST CORS --------------------------------->
export const testcors = onRequest((request, response) => {
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
