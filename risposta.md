# Piano di Correzione Definitivo per il Backend

Questo documento contiene tutte le configurazioni e il codice corretti per risolvere i problemi di CORS, regione e accesso ai dati. Le istruzioni devono essere seguite esattamente.

---

## AZIONE 1: Risolvere l'errore `internal` delle Cloud Functions

**Causa:** Le dipendenze delle funzioni non sono state installate prima del deploy. 
**Soluzione:** Eseguire i seguenti comandi in ordine dalla root del progetto.

```bash
# 1. Vai nella cartella delle funzioni
cd functions

# 2. Installa tutte le dipendenze necessarie
npm install

# 3. Torna alla directory principale
cd ..

# 4. Esegui di nuovo il deploy SOLO delle funzioni
firebase deploy --only functions
```

---

## AZIONE 2: Risolvere l'errore `Missing or insufficient permissions`

**Causa:** Le regole di Firestore non permettono la lettura dei metadati di sincronizzazione.
**Soluzione:** Sostituire l'intero contenuto del file `firestore.rules` con quello sottostante e fare il deploy.

### `firestore.rules` (Completo e Corretto)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return exists(/databases/$(database)/documents/utenti_master/$(request.auth.uid));
    }
    function isTecnico() {
      return exists(/databases/$(database)/documents/tecnici/$(request.auth.uid));
    }
    function isSignedIn() {
      return request.auth != null;
    }
    function isOwner(resource) {
      return request.auth.uid == resource.data.tecnicoId || request.auth.uid == resource.data.tecnicoScriventeId;
    }
    function isParticipant(resource) {
      return 'presenze' in resource.data && request.auth.uid in resource.data.presenze;
    }

    // NUOVA REGOLA: Permette a tutti gli utenti loggati di leggere i metadati di sync
    match /sync_state/{docId} {
      allow read: if isSignedIn();
    }

    // Accesso a ruoli e utenti
    match /utenti_master/{userId} { allow read, write: if isAdmin(); }
    match /tecnici/{userId} { allow read: if isSignedIn(); allow write: if isAdmin(); }

    // Anagrafiche (Lettura per utenti loggati, Scrittura per Admin)
    match /clienti/{d} { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /ditte/{d} { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /luoghi/{d} { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /navi/{d} { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /categorie/{d} { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /tipiGiornata/{d} { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /veicoli/{d} { allow read: if isSignedIn(); allow write: if isAdmin(); }
    
    // Dati operativi
    match /checkin_giornalieri/{docId} {
      allow create: if isTecnico() && request.resource.data.tecnicoId == request.auth.uid;
      allow read, update, delete: if isOwner(resource) || isAdmin();
    }
    match /rapportini/{id} {
      allow list: if isAdmin() || isTecnico();
      allow get: if isAdmin() || isOwner(resource) || isParticipant(resource);
      allow create: if isTecnico() && request.resource.data.tecnicoScriventeId == request.auth.uid;
      allow update, delete: if isOwner(resource) || isAdmin();
    }
  }
}
```

**Comando per il deploy delle regole:**

```bash
firebase deploy --only firestore:rules
```

---

## AZIONE 3: Creazione Manuale dell'Indice Firestore

**Quando:** Questa azione va eseguita **DOPO** aver risolto i problemi precedenti.

1.  **Eseguire l'app** dopo aver completato le Azioni 1 e 2.
2.  **Aprire la Console per Sviluppatori** del browser (tasto `F12`).
3.  L'errore `internal` sarà sparito, ma ora vedrai un errore `FAILED_PRECONDITION`. Il messaggio di errore conterrà un **lungo URL**.
4.  **Cliccare su quell'URL**. Si aprirà la console di Firebase per creare l'indice mancante.
5.  **Cliccare "Crea Indice"** e attendere che diventi "Attivo".

---

## RIFERIMENTO: Codice Cloud Functions (`functions/src/index.ts`)

Questo codice è già stato fornito ma è qui per riferimento. **NON necessita di modifiche.** L'Azione 1 lo farà funzionare.

```typescript
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "europe-west6" });

initializeApp();
const db = getFirestore();

const corsOptions = { cors: true };

export const sync_manifest = onCall(corsOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const collections = ["clienti", "navi", "luoghi", "ditte", "categorie", "tipiGiornata", "veicoli", "tecnici"];
    const manifest: { [key: string]: number } = {};
    const now = Date.now();
    for (const collName of collections) {
        manifest[collName] = now;
    }
    manifest["global"] = now;
    return { data: manifest };
});

export const syncAllAnagrafiche = onCall(corsOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const collections = ["clienti", "navi", "luoghi", "ditte", "categorie", "tipiGiornata", "veicoli", "tecnici"];
    const snapshots = await Promise.all(collections.map(c => db.collection(c).get()));
    const results: { [key: string]: any } = {};
    snapshots.forEach((snapshot, index) => {
        const collName = collections[index];
        results[collName] = { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })), timestamp: Date.now() };
    });
    return results;
});

export const createRapportino = onCall(corsOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const uid = request.auth.uid;
    const rapportinoData = request.data;
    rapportinoData.tecnicoScriventeId = uid;
    rapportinoData.createdBy = uid;
    rapportinoData.updatedBy = uid;
    rapportinoData.createdAt = FieldValue.serverTimestamp();
    rapportinoData.updatedAt = FieldValue.serverTimestamp();
    rapportinoData.isDeleted = false;
    const ref = await db.collection("rapportini").add(rapportinoData);
    return { id: ref.id };
});

export const updateRapportino = onCall(corsOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const uid = request.auth.uid;
    const { id, ...rapportinoData } = request.data;
    if (!id) throw new HttpsError("invalid-argument", "L'ID del rapportino è obbligatorio.");
    const docRef = db.collection("rapportini").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new HttpsError("not-found", "Rapportino non trovato.");
    if (doc.data()?.tecnicoScriventeId !== uid) throw new HttpsError("permission-denied", "Non hai i permessi per modificare questo rapportino.");
    rapportinoData.tecnicoScriventeId = uid;
    rapportinoData.updatedBy = uid;
    rapportinoData.updatedAt = FieldValue.serverTimestamp();
    await docRef.update(rapportinoData);
    return { id };
});

export const deleteRapportino = onCall(corsOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const uid = request.auth.uid;
    const { rapportinoId } = request.data;
    if (!rapportinoId) throw new HttpsError("invalid-argument", "L'ID del rapportino è obbligatorio.");
    const docRef = db.collection("rapportini").doc(rapportinoId);
    const doc = await docRef.get();
    if (!doc.exists) throw new HttpsError("not-found", "Rapportino non trovato.");
    if (doc.data()?.tecnicoScriventeId !== uid) throw new HttpsError("permission-denied", "Non hai i permessi per eliminare questo rapportino.");
    await docRef.update({ isDeleted: true, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
    return { id: rapportinoId };
});

export const getAllRapportiniForSync = onCall(corsOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");
    let query = db.collection("rapportini").where("presenze", "array-contains", tecnicoId);
    if (lastSyncTimestamp > 0) query = query.where("updatedAt", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return { data };
});

export const createCheckin = onCall(corsOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const checkinData = request.data;
    checkinData.tecnicoId = request.auth.uid;
    checkinData.timestampReale = FieldValue.serverTimestamp();
    const ref = await db.collection("checkin_giornalieri").add(checkinData);
    return { id: ref.id };
});

export const getCheckinsUpdates = onCall(corsOptions, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");
    let query = db.collection("checkin_giornalieri").where("tecnicoId", "==", tecnicoId);
    if (lastSyncTimestamp > 0) query = query.where("timestampReale", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return { data };
});
```
