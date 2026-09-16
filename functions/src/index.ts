import { initializeApp } from "firebase-admin/app";
// PRIMA AZIONE IN ASSOLUTO: Inizializzare l'app.
initializeApp();

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";

// Import delle nuove funzioni per le notifiche
import { getNotifiche, markNotificheAsRead, sendNotifica, deleteNotifiche } from "./notifiche";

// CORREZIONE: Rimosso blocco 'cors' non valido da setGlobalOptions.
setGlobalOptions({
  region: "europe-west6", // Impostazione globale della region
});

// Inizializzazione spostata in cima al file.
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


//<--------------------------------- FUNZIONI MASTER (Nuova Architettura) --------------------------------->

export const master_gestisciAnagrafica = onCall(async (request) => {
    // 1. Sicurezza: Verifica autenticazione e ruolo di amministratore
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta per questa operazione.");
    }
    await checkAdmin(request.auth.uid);

    // 2. Validazione dell'input
    const { collectionName, operation, data } = request.data;
    if (!collectionName || !operation || !data) {
        throw new HttpsError("invalid-argument", "Payload incompleto. Sono richiesti 'collectionName', 'operation' e 'data'.");
    }

    // 3. Whitelist delle collezioni gestibili
    const allowedCollections = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche"];
    // La collezione 'tecnici' è esclusa perché avrà una gestione dedicata più complessa.
    if (!allowedCollections.includes(collectionName)) {
        throw new HttpsError("invalid-argument", `La collezione '${collectionName}' non è gestibile tramite questa funzione.`);
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
                } else { // Altrimenti, lascio che Firestore generi l'ID
                    const newDocRef = collectionRef.doc();
                    await newDocRef.set({ ...data, id: newDocRef.id });
                    return { success: true, id: newDocRef.id };
                }
            }
            case 'update': {
                if (!data.id) {
                    throw new HttpsError("invalid-argument", "ID del documento mancante per l'operazione di 'update'.");
                }
                const { id, ...updateData } = data;
                const docRef = collectionRef.doc(id);
                await docRef.update(updateData);
                return { success: true, id };
            }
            case 'delete': {
                if (!data.id) {
                    throw new HttpsError("invalid-argument", "ID del documento mancante per l'operazione di 'delete'.");
                }
                await collectionRef.doc(data.id).delete();
                return { success: true, id: data.id };
            }
            default:
                throw new HttpsError("invalid-argument", `Operazione '${operation}' non supportata.`);
        }
    } catch (error) {
        logger.error(`[master_gestisciAnagrafica] Errore durante l'operazione '${operation}' su '${collectionName}'`, error);
        // Controlla se error è un'istanza di Error per accedere a .message
        const errorMessage = error instanceof Error ? error.message : "Errore interno del server.";
        throw new HttpsError("internal", `Impossibile completare l'operazione: ${errorMessage}`, error);
    }
});


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
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    try {
        logger.info(`[syncAllAnagrafiche] Chiamata ricevuta. Payload: ${JSON.stringify(request.data)}`);
        const collectionsToSync = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
        const allData: { [key: string]: unknown[] } = {}; // Tipo piu specifico per 'any'
        const promises = collectionsToSync.map(async (coll) => {
            const snapshot = await db.collection(coll).get();
            allData[coll] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        await Promise.all(promises);
        return allData;
    } catch (error) {
        logger.error("ERRORE in syncAllAnagrafiche:", error);
        throw new HttpsError("internal", "Impossibile completare la sincronizzazione delle anagrafiche.", error);
    }
});

export const createRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.rapportinoData) throw new HttpsError("invalid-argument", "Dati del rapportino mancanti.");
    const { rapportinoData } = request.data;
    const newRapportinoRef = db.collection("rapportini").doc();
    await newRapportinoRef.set({ ...rapportinoData, id: newRapportinoRef.id, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), isDeleted: false });
    return { id: newRapportinoRef.id };
});

export const updateRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.id || !request.data.rapportinoData) throw new HttpsError("invalid-argument", "ID o dati del rapportino mancanti.");
    const { id, rapportinoData } = request.data;
    const rapportinoRef = db.collection("rapportini").doc(id);
    await rapportinoRef.update({ ...rapportinoData, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});

export const deleteRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.id) throw new HttpsError("invalid-argument", "ID del rapportino mancante.");
    const { id } = request.data;
    await db.collection("rapportini").doc(id).update({ isDeleted: true, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});

// ================== BUG FIX APPLICATO (Versione da comunicazione.md) ==================
export const getAllRapportiniForSync = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");

    // CORREZIONE: La query ora funziona correttamente anche per la prima sincronizzazione (lastSyncTimestamp = 0).
    let query = db.collection("rapportini")
        .where("presenze", "array-contains", tecnicoId)
        .where("updatedAt", ">", new Date(lastSyncTimestamp));

    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});
// ====================================================================================

export const createCheckin = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.checkinData) throw new HttpsError("invalid-argument", "Dati del check-in mancanti.");
    const { checkinData } = request.data;
    const newCheckinRef = db.collection("checkin_giornalieri").doc();
    await newCheckinRef.set({ ...checkinData, id: newCheckinRef.id, timestampReale: FieldValue.serverTimestamp() });
    return { id: newCheckinRef.id };
});

// ================== BUG FIX APPLICATO (Versione da comunicazione.md) ==================
export const getCheckinsUpdates = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");

    // CORREZIONE: La query ora funziona correttamente anche per la prima sincronizzazione (lastSyncTimestamp = 0).
    let query = db.collection("checkin_giornalieri")
        .where("tecnicoId", "==", tecnicoId)
        .where("timestampReale", ">", new Date(lastSyncTimestamp));

    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});
// ====================================================================================


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
    if (!request.data || !request.data.action || !request.data.payload) throw new HttpsError("invalid-argument", "Azione o payload mancanti.");
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
            throw new HttpsError("invalid-argument", `Azione '${action}' non riconosciuta.`);
    }
});

//<--------------------------------- FUNZIONI VARIE --------------------------------->

export const saveFCMToken = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.token) throw new HttpsError("invalid-argument", "Token FCM mancante.");
    const { token } = request.data;
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


//<--------------------------------- FUNZIONI NOTIFICHE --------------------------------->

// Esporto le nuove funzioni per renderle disponibili
export { getNotifiche, markNotificheAsRead, sendNotifica, deleteNotifiche };


//<--------------------------------- FUNZIONI SINCRONIZZAZIONE OFFLINE (Legacy) --------------------------------->

export const createDocumento = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Richiesta autenticazione.");
    if (!request.data || !request.data.data) throw new HttpsError("invalid-argument", "Dati mancanti.");
    const { data } = request.data;
    const docRef = db.collection('documenti').doc();
    await docRef.set({ ...data, id: docRef.id, createdAt: FieldValue.serverTimestamp() });
    return { id: docRef.id };
});

export const updateDocumento = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Richiesta autenticazione.");
    if (!request.data || !request.data.id || !request.data.data) throw new HttpsError("invalid-argument", "ID o dati mancanti.");
    const { id, data } = request.data;
    await db.collection('documenti').doc(id).update({ ...data, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});

export const deleteDocumento = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Richiesta autenticazione.");
    if (!request.data || !request.data.id) throw new HttpsError("invalid-argument", "ID mancante.");
    const { id } = request.data;
    await db.collection('documenti').doc(id).delete();
    return { success: true };
});

export const syncAnagrafica = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.collectionName || !request.data.operation || !request.data.data) throw new HttpsError("invalid-argument", "Dati obbligatori mancanti.");
    const { collectionName, operation, data } = request.data;
    const allowedCollections = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    if (!allowedCollections.includes(collectionName)) throw new HttpsError("invalid-argument", `Collezione '${collectionName}' non valida.`);
    
    const collectionRef = db.collection(collectionName);
    const versionRef = db.collection(collectionName).doc('version');

    switch (operation) {
        case 'create': {
            const newDocRef = collectionRef.doc();
            await newDocRef.set({ ...data, id: newDocRef.id });
            await versionRef.set({ number: FieldValue.increment(1) }, { merge: true });
            return { success: true, id: newDocRef.id };
        }
        case 'update': {
            if (!data.id) throw new HttpsError("invalid-argument", "ID mancante per l'update.");
            const docRef = collectionRef.doc(data.id);
            await docRef.update(data);
            await versionRef.set({ number: FieldValue.increment(1) }, { merge: true });
            return { success: true };
        }
        case 'delete': {
            if (!data.id) throw new HttpsError("invalid-argument", "ID mancante per il delete.");
            await collectionRef.doc(data.id).delete();
            await versionRef.set({ number: FieldValue.increment(1) }, { merge: true });
            return { success: true };
        }
        default:
            throw new HttpsError("invalid-argument", `Operazione '${operation}' non supportata.`);
    }
});

//<--------------------------------- TEST CORS --------------------------------->
export const testcors = onRequest((request, response) => {
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
