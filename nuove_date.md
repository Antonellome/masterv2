# Piano di Migrazione Architetturale: Date ISO 8601 e Sync Incrementale

## 1. Executive Summary

Questo documento definisce un piano d'azione per una migrazione architetturale critica dell'applicazione. La migrazione affronta due problemi fondamentali emersi durante lo sviluppo:

1.  **Fragilità del Formato Data:** L'attuale formato data, un oggetto Timestamp legacy di Firestore (`{_seconds, _nanoseconds}`), è illeggibile, difficile da debuggare e ha già causato errori critici dovuti a inconsistenze nel nome delle proprietà (`seconds` vs `_seconds`).
2.  **Inefficienza della Sincronizzazione:** L'attuale strategia di sincronizzazione, che scarica l'intera cronologia dei rapportini ad ogni avvio, non è scalabile, consuma una quantità eccessiva di dati e degraderà le performance all'aumentare dei dati.

La soluzione proposta è un'adozione di standard web moderni e universalmente accettati:

*   **Adozione di Date ISO 8601:** Tutte le date verranno standardizzate al formato stringa **ISO 8601 UTC** (es. `"2026-08-21T10:30:00.123Z"`). Questo formato è leggibile, robusto e gestito nativamente da JavaScript e da tutti i moderni database.
*   **Implementazione di Sincronizzazione Incrementale:** Il meccanismo di sync verrà riscritto per scaricare solo i dati nuovi o modificati dall'ultima sincronizzazione, riducendo il traffico dati del 99% e garantendo un avvio quasi istantaneo dell'app.

Questa migrazione risolverà i problemi attuali alla radice, semplificherà il codice futuro e renderà l'applicazione più performante e robusta.

---

## 2. Piano di Intervento sul Backend v2

Le seguenti modifiche sono **prioritarie e bloccanti**. L'app client non può essere aggiornata finché il backend non le ha implementate.

### Obiettivo 1: Migrazione "Una Tantum" del Database

Si adotta la "Strategia 1" per una pulizia definitiva.

#### Passo 1.1: Scrittura dello Script di Migrazione

È necessario creare uno script (es. Node.js, Python) che si connetta al database di produzione e esegua la seguente logica:

**Pseudo-codice dello script:**

```javascript
// Questo script deve essere eseguito UNA SOLA VOLTA
const allRecords = await database.collection('rapportini').getAll();

for (const record of allRecords) {
    const dataToUpdate = {};

    // Converti il campo 'data'
    if (record.data && typeof record.data._seconds === 'number') {
        dataToUpdate.data = new Date(record.data._seconds * 1000).toISOString();
    } else {
        // Logga record con formato data anomalo o già convertito
        console.log(`Record ${record.id} con formato data non standard.`);
    }

    // Converti il campo 'updatedAt' (essenziale per il sync futuro)
    if (record.updatedAt && typeof record.updatedAt._seconds === 'number') {
        dataToUpdate.updatedAt = new Date(record.updatedAt._seconds * 1000).toISOString();
    } else {
        // Se updatedAt non esiste, impostalo alla data del rapportino o alla data attuale
        dataToUpdate.updatedAt = dataToUpdate.data || new Date().toISOString();
    }
    
    // Converti il campo 'createdAt'
    if (record.createdAt && typeof record.createdAt._seconds === 'number') {
        dataToUpdate.createdAt = new Date(record.createdAt._seconds * 1000).toISOString();
    }

    // Esegui l'aggiornamento solo se ci sono campi da modificare
    if (Object.keys(dataToUpdate).length > 0) {
        await database.collection('rapportini').doc(record.id).update(dataToUpdate);
        console.log(`Record ${record.id} migrato con successo.`);
    }
}
console.log("Migrazione del database completata.");
```

#### Passo 1.2: Esecuzione Controllata dello Script

1.  **Backup del Database:** Eseguire un backup completo prima di lanciare lo script.
2.  **Staging:** Testare lo script su un ambiente di staging che sia una copia fedele della produzione.
3.  **Produzione:** Eseguire lo script in un momento di basso traffico.

### Obiettivo 2: Aggiornamento della Logica API

#### Passo 2.1: Endpoint di Scrittura (`createRapportino`, `updateRapportino`)

*   Questi endpoint devono essere modificati per accettare le date in formato stringa ISO 8601.
*   Qualsiasi logica interna che generi una data (es. `createdAt`, `updatedAt`) deve generarla come `new Date().toISOString()`.
*   **Fondamentale:** l'endpoint `updateRapportino` (e anche `createRapportino`) **DEVE** aggiornare automaticamente il campo `updatedAt` con la data e l'ora correnti (`new Date().toISOString()`) ad ogni singola modifica.

#### Passo 2.2: Endpoint di Lettura (`getAllRapportiniForSync`)

Questo endpoint deve essere modificato per diventare `syncRapportini` e accettare un parametro opzionale: `since` (es. `GET /api/sync/rapportini?since=2026-08-21T10:30:00.123Z`).

**Logica del nuovo endpoint:**

```javascript
function syncRapportini(request) {
    const { since } = request.query;
    const tecnicoId = request.user.tecnicoId; // Recupera l'ID del tecnico autenticato

    let query = database.collection('rapportini').where('tecnicoId', '==', tecnicoId);

    if (since) {
        // La data 'since' deve essere una stringa ISO 8601 valida
        // Aggiungi la condizione per scaricare solo i record più recenti
        query = query.where('updatedAt', '>', since);
    }

    // Se 'since' non è fornito, la query scarica tutti i rapportini (per il primo sync).
    const results = await query.get();

    // Restituisci i risultati all'app
    return results.map(doc => doc.data());
}
```

---

## 3. Piano di Intervento sull'App Client (React)

Le seguenti modifiche all'app potranno essere eseguite solo **dopo** che il backend sarà stato aggiornato.

### Obiettivo 1: Pulizia del Codice Legacy

*   **Rimozione di `safeConvertToDate`:** La funzione in `src/services/offlineSync.ts` (e simili in altre parti del codice come `ReportListPage.tsx`) diventerà obsoleta e dovrà essere eliminata.
*   **Sostituzione delle Conversioni:** Tutte le istanze di `new Date(value._seconds * 1000)` dovranno essere sostituite con un semplice `new Date(isoString)`, che è il metodo nativo di JavaScript per parsificare le stringhe ISO.

### Obiettivo 2: Implementazione della Logica di Sync Incrementale

La funzione `syncRapportiniFromServer` in `src/services/offlineSync.ts` sarà riscritta.

**Pseudo-codice della nuova logica:**

```javascript
// In un file di utility o nel local-db.ts
async function getLastSyncTimestamp() {
    const state = await db.syncState.get('lastSync');
    return state ? state.value : null;
}

async function setLastSyncTimestamp(serverDate) { // Usa la data del server!
    await db.syncState.put({ id: 'lastSync', value: serverDate });
}

// In offlineSync.ts

async function syncRapportiniFromServer() {
    if (!navigator.onLine) return;

    const lastSync = await getLastSyncTimestamp();

    // Chiama il nuovo endpoint API, passando 'lastSync' se esiste
    const response = await apiSyncRapportini({ since: lastSync });
    const remoteRapportini = response.data; 

    if (remoteRapportini && remoteRapportini.length > 0) {
        // Usa bulkPut: aggiorna i record esistenti e inserisce i nuovi.
        // NON CANCELLA PIÙ LA TABELLA!
        await db.rapportini.bulkPut(remoteRapportini);
        console.log(`Sync incrementale: ${remoteRapportini.length} record aggiornati/inseriti.`);
    }

    // Salva la data di "ultima sincronizzazione" per la prossima volta.
    // È FONDAMENTALE usare la data restituita dal server nell'header 'Date' della risposta HTTP
    // per evitare problemi di disallineamento degli orologi (client vs server).
    const serverTimestamp = response.headers.get('Date');
    if (serverTimestamp) {
        await setLastSyncTimestamp(new Date(serverTimestamp).toISOString());
    }
}
```

### Obiettivo 3: Gestione del Primo Sync

La logica sopra gestisce implicitamente il primo sync. Se `getLastSyncTimestamp()` restituisce `null`, il parametro `since` non viene inviato, e il backend (come da sua nuova logica) restituirà l'intera lista di rapportini, popolando il database locale per la prima volta. Non sarà più necessario il `db.rapportini.clear()`.

---

## 4. Sequenza di Deployment Raccomandata

Per garantire una transizione fluida e senza downtime:

1.  **Fase 1 (Backend):** Completare e testare tutte le modifiche al backend (Obiettivi 1 e 2).
2.  **Fase 2 (App):** Completare e testare le modifiche all'app client.
3.  **Fase 3 (Go-Live):**
    a. Deployare la nuova versione del **backend**.
    b. Eseguire lo **script di migrazione una-tantum** sul database di produzione.
    c. Rilasciare la **nuova versione dell'app** client agli store.
