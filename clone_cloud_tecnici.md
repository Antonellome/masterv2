# CLONE DI SICUREZZA - CLOUD FUNCTIONS "TECNICI"

**Data Snapshot:** 18 Settembre 2026

---

## 1. Motivazione e Contesto

Questo documento rappresenta un **clone di sicurezza statico** del codice sorgente delle Cloud Functions appartenenti alla codebase `tecnici`, catturato immediatamente dopo la grande ristrutturazione architetturale che ha separato il backend in due codebase distinte: `master` e `tecnici`.

Il suo scopo è triplice:

1.  **Storico:** Fornire una fotografia esatta e immutabile del codice critico dell'app Tecnici al momento della separazione.
2.  **Riferimento:** Agire come punto di riferimento "verità d'origine" in caso di future, e autorizzate, analisi o debug. Permette di confrontare il comportamento di allora con quello attuale.
3.  **Sicurezza:** In uno scenario di emergenza catastrofico, questo clone può servire come base per un ripristino manuale, sebbene il suo scopo primario sia la documentazione e non il deployment.

**Questo file non deve essere modificato.** Rappresenta una fotografia storica.

---

## 2. Codice Sorgente (`functions/tecnici/src/index.ts`)

```typescript
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "europe-west6" });

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
    const collectionsToSync = ["clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata", "sistemi", "lavorazioni", "qualifiche", "tecnici"];
    const allData: { [key: string]: unknown[] } = {};
    const promises = collectionsToSync.map(async (coll) => {
        const snapshot = await db.collection(coll).get();
        allData[coll] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
    await Promise.all(promises);
    return allData;
});

export const getAllRapportiniForSync = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }

    const { lastSyncTimestamp = 0, tecnicoId } = request.data;

    if (!tecnicoId) {
        throw new HttpsError("invalid-argument", "ID tecnico non valido.");
    }
    if (request.auth.uid !== tecnicoId) {
        throw new HttpsError("permission-denied", "Non puoi sincronizzare i rapportini di un altro utente.");
    }

    let query = db.collection("rapportini").where("presenze", "array-contains", tecnicoId);

    if (lastSyncTimestamp > 0) {
        query = query.where("updatedAt", ">", new Date(lastSyncTimestamp));
    }

    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
});

export const getCheckinsUpdates = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");

    let query = db.collection("checkin_giornalieri")
        .where("tecnicoId", "==", tecnicoId)
        .where("timestampReale", ">", new Date(lastSyncTimestamp));

    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
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

export const createCheckin = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.checkinData) throw new HttpsError("invalid-argument", "Dati del check-in mancanti.");
    const { checkinData } = request.data;
    const newCheckinRef = db.collection("checkin_giornalieri").doc();
    await newCheckinRef.set({ ...checkinData, id: newCheckinRef.id, timestampReale: FieldValue.serverTimestamp() });
    return { id: newCheckinRef.id };
});

export const saveFCMToken = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.token) throw new HttpsError("invalid-argument", "Token FCM mancante.");
    const { token } = request.data;
    const tokenRef = db.collection("fcmTokens").doc(request.auth.uid);
    await tokenRef.set({ token, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});

export const getNotifiche = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const tecnicoId = request.auth.token.tecnicoId;
    if (!tecnicoId) {
        throw new HttpsError("failed-precondition", "Token utente incompleto.");
    }
    const snapshot = await db.collection("notifiche").where("tecnicoId", "==", tecnicoId).orderBy("createdAt", "desc").get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

export const markNotificheAsRead = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const ids = request.data.notificationIds;
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new HttpsError("invalid-argument", "È richiesto un array di ID.");
    }
    const batch = db.batch();
    ids.forEach(id => {
        batch.update(db.collection("notifiche").doc(id), { isRead: true, letta: true });
    });
    await batch.commit();
    return { success: true };
});
```
