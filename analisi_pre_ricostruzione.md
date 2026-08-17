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
    *   **STATO: FATTO.**

---

## Fase 1: Ristrutturazione del Sistema di Autenticazione e Permessi

**Obiettivo:** Risolvere la falla di sicurezza principale (**SEC-1**) e stabilire una fonte di verità unica e affidabile per i permessi utente.

1.  **Abbandono della Collezione `admins`:**
    *   **STATO: FATTO.**

2.  **Implementazione dei Custom Claims di Firebase Authentication:**
    *   **STATO: FATTO.**

3.  **Refactoring del Client per Usare i Custom Claims:**
    *   **STATO: FATTO.**

4.  **Implementazione Funzionalità Reset Password:**
    *   **STATO: FATTO.**

### ***Correzione Architetturale in Corso d'Opera (Post-Fase 1)***

*   **PROBLEMA RILEVATO:** La prima implementazione della Fase 1 si è rivelata pericolosa e errata. La Cloud Function `admin_getAllUsers` recuperava **tutti** gli utenti da Firebase Auth, creando una contaminazione di dati in cui i "tecnici" venivano mostrati nella tabella di gestione amministratori, introducendo un rischio di security enorme (un tecnico poteva essere promosso admin).

*   **SOLUZIONE DEFINITIVA:** Per separare in modo netto e sicuro il personale "amministrativo" dai "tecnici", viene introdotto un nuovo Custom Claim a livello di Firebase Authentication:
    *   **`livello: 'staff'`**: Questo claim identificherà in modo univoco e sicuro un utente come parte del personale amministrativo, autorizzato ad apparire nella sezione "Impostazioni -> Amministratori".

*   **NUOVA LOGICA DELLE CLOUD FUNCTIONS:**
    *   **`admin_getAllUsers` (DA RISCRIVERE):** Questa funzione DEVE essere riscritta. La sua unica responsabilità sarà quella di scorrere TUTTI gli utenti in Firebase Auth e restituire al client **SOLO E SOLTANTO** quelli che possiedono il claim **`livello: 'staff'`**. Tutta la logica di filtro avviene lato server, garantendo che il client riceva solo dati "puri".
    *   **`amministrazione_gestisciUtenti` (DA MODIFICARE):** Questa funzione verrà aggiornata per gestire il nuovo flusso:
        *   **In Creazione:** Quando un nuovo utente viene creato da questa interfaccia, la funzione gli assegnerà i claims di default: `{ livello: 'staff', admin: false }`. Sarà possibile specificare una password iniziale e se promuoverlo subito ad `admin: true`.
        *   **In Modifica Ruolo:** L'azione di `toggleRole` si limiterà a cambiare il valore del claim `admin` tra `true` e `false`, lasciando `livello: 'staff'` inalterato.

---

## Fase 2: Creazione di un'API Sicura con Cloud Functions

**Obiettivo:** Eliminare completamente l'accesso diretto a Firestore dal client per le operazioni di scrittura, risolvendo **SEC-2** e **SEC-3**.

1.  **Sviluppo di Cloud Functions CRUD Generiche.**
2.  **Implementazione della Sicurezza nelle Functions.**
3.  **Refactoring del Client per Usare le Nuove Functions.**
4.  **Ricostruzione Sezione Notifiche.**

---

## Fase 3: Ottimizzazione delle Performance e Refactoring del Data Fetching

**Obiettivo:** Risolvere i problemi di performance (**PERF-1, PERF-2**).

1.  **Spostamento delle Aggregazioni sul Backend.**
2.  **Refactoring del Data Fetching sul Client.**
3.  **Eliminazione di Dexie.js (IndexedDB).**

---

## Fase 4: Pulizia e Finalizzazione

**Obiettivo:** Consolidare il lavoro svolto.

1.  **Refactoring delle Security Rules di Firestore.**
2.  **Revisione del Codice.**
3.  **Test End-to-End.**
