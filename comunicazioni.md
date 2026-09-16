# Documentazione Cloud Functions per App Tecnici

**Data:** 06/08/2026

Questo documento elenca e descrive tutte le Cloud Functions del backend "Master" che sono state sviluppate e messe a disposizione per l'utilizzo da parte dell'applicazione "Tecnici".

Tutte le funzioni sono di tipo `onCall` e richiedono autenticazione Firebase. La configurazione CORS è stata aggiornata per accettare richieste dall'origine specifica dell'app Tecnici.

---

## Indice Funzioni

1.  **Sincronizzazione e Anagrafiche**
    *   `sync_manifest`
    *   `syncAllAnagrafiche`
    *   `getAllRapportiniForSync`
    *   `getCheckinsUpdates`
2.  **Gestione Rapportini**
    *   `createRapportino`
    *   `updateRapportino`
    *   `deleteRapportino`
3.  **Gestione Check-in**
    *   `createCheckin`
4.  **Notifiche e Token**
    *   `saveFCMToken`
    *   `getNotifiche`
    *   `markNotificheAsRead`

---

## 1. Sincronizzazione e Anagrafiche

### `sync_manifest`

Fornisce un "manifest" con i timestamp dell'ultima modifica per ogni anagrafica. Utile per il client per decidere quali dati riscaricare.

```typescript
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
```

### `syncAllAnagrafiche`

Scarica tutti i documenti da tutte le collezioni di anagrafiche. Da usare per la prima sincronizzazione o per un reset completo.

```typescript
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
```

### `getAllRapportiniForSync`

Recupera tutti i rapportini di un tecnico che sono stati aggiornati dopo un certo timestamp.

```typescript
export const getAllRapportiniForSync = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");

    let query = db.collection("rapportini")
        .where("presenze", "array-contains", tecnicoId)
        .where("updatedAt", ">", new Date(lastSyncTimestamp));

    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});
```

### `getCheckinsUpdates`

Recupera tutti i check-in di un tecnico che sono stati creati dopo un certo timestamp.

```typescript
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
```

---

## 2. Gestione Rapportini

### `createRapportino`

Crea un nuovo documento per un rapportino nel database.

```typescript
export const createRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.rapportinoData) throw new HttpsError("invalid-argument", "Dati del rapportino mancanti.");
    const { rapportinoData } = request.data;
    const newRapportinoRef = db.collection("rapportini").doc();
    await newRapportinoRef.set({ ...rapportinoData, id: newRapportinoRef.id, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), isDeleted: false });
    return { id: newRapportinoRef.id };
});
```

### `updateRapportino`

Aggiorna un rapportino esistente.

```typescript
export const updateRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.id || !request.data.rapportinoData) throw new HttpsError("invalid-argument", "ID o dati del rapportino mancanti.");
    const { id, rapportinoData } = request.data;
    const rapportinoRef = db.collection("rapportini").doc(id);
    await rapportinoRef.update({ ...rapportinoData, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});
```

### `deleteRapportino`

Esegue un "soft delete" di un rapportino, marcandolo come cancellato.

```typescript
export const deleteRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.id) throw new HttpsError("invalid-argument", "ID del rapportino mancante.");
    const { id } = request.data;
    await db.collection("rapportini").doc(id).update({ isDeleted: true, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});
```

---

## 3. Gestione Check-in

### `createCheckin`

Crea un nuovo documento per un check-in giornaliero.

```typescript
export const createCheckin = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.checkinData) throw new HttpsError("invalid-argument", "Dati del check-in mancanti.");
    const { checkinData } = request.data;
    const newCheckinRef = db.collection("checkin_giornalieri").doc();
    await newCheckinRef.set({ ...checkinData, id: newCheckinRef.id, timestampReale: FieldValue.serverTimestamp() });
    return { id: newCheckinRef.id };
});
```

---

## 4. Notifiche e Token

### `saveFCMToken`

Salva o aggiorna il token di Firebase Cloud Messaging (FCM) per un utente, per abilitare le notifiche push.

```typescript
export const saveFCMToken = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    if (!request.data || !request.data.token) throw new HttpsError("invalid-argument", "Token FCM mancante.");
    const { token } = request.data;
    const tokenRef = db.collection("fcmTokens").doc(request.auth.uid);
    await tokenRef.set({ token, updatedAt: FieldValue.serverTimestamp() });
    return { success: true };
});
```

### `getNotifiche`

Recupera tutte le notifiche per il tecnico autenticato.

```typescript
export const getNotifiche = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        if (!request.auth) {
            throw new functions.HttpsError("unauthenticated", "Autenticazione richiesta.");
        }
        const tecnicoId = request.auth.token.tecnicoId;
        if (!tecnicoId) {
            throw new functions.HttpsError("failed-precondition", "Token utente incompleto.");
        }
        const snapshot = await db.collection("notifiche").where("tecnicoId", "==", tecnicoId).orderBy("createdAt", "desc").get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
```

### `markNotificheAsRead`

Segna una o più notifiche come lette.

```typescript
export const markNotificheAsRead = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        if (!request.auth) {
            throw new functions.HttpsError("unauthenticated", "Autenticazione richiesta.");
        }
        const ids = request.data.notificationIds;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new functions.HttpsError("invalid-argument", "È richiesto un array di ID.");
        }
        const batch = db.batch();
        ids.forEach(id => {
            batch.update(db.collection("notifiche").doc(id), { isRead: true, letta: true });
        });
        await batch.commit();
        return { success: true };
    });
```
