# Regole di Interazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola del CIAO:** Ogni singolo messaggio in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.

**Regola della Persistenza dei File di Contesto:** I file che forniscono contesto (`app_master.md`, `blueprint.md`, e questo file) non devono **MAI** essere sovrascritti o cancellati. Devono essere **SEMPRE E SOLO AGGIORNATI** per preservare le regole, lo storico delle decisioni e le analisi passate. La cancellazione o sovrascrizione è un errore critico.

---

# Analisi Pre-Ricostruzione (COMPLETATA)

Questo documento contiene la mappatura dettagliata dell'applicazione e l'analisi di ogni sua parte. L'analisi è ora completa.

## Architettura Generale Rilevata

*   **Backend:** Firebase (Authentication, Firestore, Cloud Functions).
*   **Frontend:** React con Vite.
*   **UI:** Material-UI (MUI) e MUI X (per `DataGrid`).
*   **Stato Globale:** Zustand (`useGlobalStore`).
*   **Database Locale:** Dexie.js (IndexedDB).
*   **Logica Client-Heavy:** Enorme quantità di logica di business eseguita nel browser (**PERF-1, PERF-2**).

---

## Analisi Dettagliata per Sezione

### 1. Autenticazione (Analisi Completata)

*   **Falla Critica (SEC-1, DI-2):** Sistema di permessi rotto e inaffidabile. Il client non si fida del token sicuro di Firebase.

### 2. Tecnici (Analisi Completata)

*   **Criticità:** Funzionalità di invio email per reset password **non implementata**.

### 3. Reportistica (Analisi Completata)

*   **Criticità Grave:** Logica di business insostenibile eseguita sul client (**PERF-1, PERF-2**).
*   **BUG di Sicurezza:** Cancellazione senza verifica permessi.

### 4. Presenze (Analisi Completata)

*   **Architettura:** Fragile, dipendente dal caricamento dati globale.

### 5. Anagrafiche (Analisi Completata)

*   **Design Pattern:** Eccellente design scalabile.
*   **Criticità:** Minato da fondamenta deboli (dipendenza da stato globale, join sul client, API non sicura).

### 6. Documenti / Scadenze (Analisi Completata)

*   **Falla di Sicurezza (SEC-2):** CRUD completo eseguito direttamente dal client su Firestore, senza controlli.
*   **Inconsistenza Architetturale (A-1):** Ignora gli standard del resto dell'app.

### 7. Notifiche (Analisi Completata)

*   **Falla di Sicurezza (SEC-3):** Qualsiasi utente può inviare notifiche a chiunque scrivendo direttamente su Firestore.
*   **Funzionalità Mancante:** Il sistema **non invia vere notifiche push** (FCM).

### 8. Impostazioni / Amministrazione (Analisi Completata)

*   **Causa Principale di SEC-1:** La gestione dei ruoli è basata su una collezione Firestore separata (`admins`) invece che sui **Firebase Auth Custom Claims**. Questo è l'errore architetturale che invalida il sistema di permessi dell'intera app.
*   **Implementazione Sicura (per le Scritture):** Paradossalmente, il componente usa correttamente una Cloud Function (`amministrazione_gestisciUtenti`) per tutte le operazioni di modifica.

### 9. Dashboard (Analisi Completata)

*   **Epicentro delle Criticità di Performance (PERF-1, PERF-2):** La dashboard è l'esempio perfetto dell'architettura client-heavy. Esegue calcoli, aggregazioni e join estremamente pesanti direttamente nel browser.
*   **Dipendenza dallo Stato Globale:** Non ha logica di data-fetching propria, ma dipende completamente dai dati caricati all'avvio.

---

# Piano di Ricostruzione e Refactoring

Questo documento delinea la strategia e i passaggi necessari per ristrutturare l'applicazione, correggere le falle di sicurezza, migliorare le performance e stabilire un'architettura robusta e scalabile.

L'obiettivo è trasformare l'applicazione da un prototipo client-heavy e insicuro a un prodotto di livello enterprise, sicuro e performante, seguendo le best practice di sviluppo con Firebase e React.

---

## Fase 0: Messa in Sicurezza delle Cloud Functions Esistenti

**Obiettivo:** Mitigare immediatamente i rischi più gravi prima del refactoring completo.

1.  **Analisi `amministrazione_gestisciUtenti`:**
    *   Ispezionare il codice della funzione per assicurarsi che contenga controlli per verificare che solo un amministratore (tramite custom claims, che imposteremo nella Fase 1) possa eseguire operazioni critiche.
    *   Dato che il sistema di claims non è ancora attivo, questo passaggio è preparatorio ma fondamentale.

---

## Fase 1: Ristrutturazione del Sistema di Autenticazione e Permessi

**Obiettivo:** Risolvere la falla di sicurezza principale (**SEC-1**) e stabilire una fonte di verità unica e affidabile per i permessi utente.

1.  **Abbandono della Collezione `admins`:**
    *   La collezione `admins` verrà eliminata. Il ruolo di un utente non sarà più determinato dalla sua presenza in questa lista.

2.  **Implementazione dei Custom Claims di Firebase Authentication:**
    *   Modificare la Cloud Function `amministrazione_gestisciUtenti`. Quando un utente viene promosso ad "admin", la funzione userà l'SDK Admin di Firebase per impostare un custom claim sul suo account: `setCustomUserClaims(uid, { admin: true })`.
    *   Quando il ruolo viene revocato, il claim verrà rimosso: `setCustomUserClaims(uid, { admin: false })`.

3.  **Refactoring del Client per Usare i Custom Claims:**
    *   Il client leggerà i permessi direttamente dal token ID dell'utente (`idTokenResult.claims.admin`).
    *   Lo stato globale (`useGlobalStore`) verrà aggiornato per memorizzare il ruolo letto dai claims, non più da una query su Firestore.
    *   Questo elimina la necessità di query aggiuntive e rende il token la fonte di verità unica (**DI-2**).

4.  **Implementazione Funzionalità Reset Password:**
    *   Nella sezione "Tecnici", il pulsante di reset password chiamerà la funzione `sendPasswordResetEmail` di Firebase Auth, risolvendo la funzionalità mancante.

---

## Fase 2: Creazione di un'API Sicura con Cloud Functions

**Obiettivo:** Eliminare completamente l'accesso diretto a Firestore dal client per le operazioni di scrittura, risolvendo **SEC-2** e **SEC-3**.

1.  **Sviluppo di Cloud Functions CRUD Generiche:**
    *   Creare una serie di Cloud Functions (o una singola funzione "gateway") per gestire tutte le operazioni di Create, Update, Delete per le collezioni principali: `documenti`, `scadenze`, `rapportini`, etc.

2.  **Implementazione della Sicurezza nelle Functions:**
    *   Ogni funzione DEVE iniziare controllando i custom claims del chiamante (`context.auth.token.admin === true`).
    *   Le operazioni verranno eseguite solo se l'utente ha i permessi necessari.

3.  **Refactoring del Client per Usare le Nuove Functions:**
    *   Sostituire tutte le chiamate dirette a `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch` nel codice del client con chiamate alle nuove Cloud Functions (`httpsCallable`).

4.  **Ricostruzione Sezione Notifiche:**
    *   Creare una nuova Cloud Function `inviaNotifica`.
    *   Questa funzione riceverà il target, titolo e corpo. Verificherà i permessi, recupererà i token FCM dei destinatari e userà l'SDK Admin di FCM per inviare **vere notifiche push**.
    *   Il client chiamerà solo questa funzione, eliminando la falla **SEC-3** e implementando la funzionalità mancante.

---

## Fase 3: Ottimizzazione delle Performance e Refactoring del Data Fetching

**Obiettivo:** Risolvere i problemi di performance (**PERF-1, PERF-2**) spostando la logica di business pesante dal client al backend.

1.  **Spostamento delle Aggregazioni sul Backend:**
    *   Creare Cloud Functions specifiche per le esigenze della **Dashboard** e della **Reportistica**.
    *   **Esempio 1:** `getDashboardStats(mese, anno)` calcolerà le ore totali, il numero di rapportini e i dati per i grafici, restituendo un singolo oggetto JSON ottimizzato.
    *   **Esempio 2:** `getCalendarioRapportiniMancanti(mese, anno)` eseguirà la logica complessa sul server e restituirà solo i dati necessari per la visualizzazione.

2.  **Refactoring del Data Fetching sul Client:**
    *   Rimuovere il caricamento massivo di tutti i dati all'avvio dell'app (`DataHydrator`).
    *   Ogni componente o pagina diventerà responsabile del proprio data fetching, chiamando le nuove Cloud Functions on-demand.
    *   Utilizzare librerie come `react-query` o `swr` (o anche semplici `useEffect`) per gestire lo stato di loading, error e caching dei dati a livello di componente.
    *   Questo renderà l'avvio dell'app quasi istantaneo e ridurrà drasticamente il consumo di memoria.

3.  **Eliminazione di Dexie.js (IndexedDB):**
    *   Con il data fetching on-demand, la necessità di una cache locale complessa come Dexie diminuisce. Verrà valutata la sua completa rimozione in favore di un caching in memoria più semplice gestito da `react-query`/`swr`.

---

## Fase 4: Pulizia e Finalizzazione

**Obiettivo:** Consolidare il lavoro svolto e assicurare la coerenza del codebase.

1.  **Refactoring delle Security Rules di Firestore:**
    *   Le regole verranno semplificate drasticamente. Le scritture verranno negate a quasi tutti i percorsi (`allow write: if false;`), dato che tutte le modifiche passeranno tramite le Cloud Functions sicure.
    *   Le regole di lettura (`allow read`) verranno mantenute e, se necessario, raffinate.

2.  **Revisione del Codice:**
    *   Effettuare una revisione completa per eliminare codice morto (es. `DataHydrator`, vecchie chiamate a Firestore, la collezione `admins`).
    *   Assicurare la coerenza dello stile e l'aderenza ai nuovi pattern architetturali in tutta l'applicazione.

3.  **Test End-to-End:**
    *   Eseguire test manuali completi per verificare che tutte le funzionalità siano state ripristinate correttamente e che le falle di sicurezza siano state chiuse.
