# Regole di Interazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola del CIAO:** Ogni singolo messaggio in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.

**Regola della Persistenza dei File di Contesto:** I file che forniscono contesto (`app_master.md`, `blueprint.md`, e questo file) non devono **MAI** essere sovrascritti o cancellati. Devono essere **SEMPRE E SOLO AGGIORNATI** per preservare le regole, lo storico delle decisioni e le analisi passate. La cancellazione o sovrascritta è un errore critico.

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

# FASE ATTUALE: Analisi Criticità e Piano di Bonifica Modulo Reportistica (Pre-Fase K)

Questa sezione documenta l'analisi dettagliata e il piano d'azione per risolvere la grave crisi di dati e stabilità emersa nel modulo di reportistica, che ha reso l'applicazione inutilizzabile per la gestione dei rapportini.

## Diagnosi del "Casino": Stato della Reportistica

L'analisi congiunta ha portato alla luce un "campo di battaglia" di dati corrotti e un'applicazione frontend instabile, con le seguenti manifestazioni:

1.  **Corruzione Massiva dei Dati nel Backend (Firestore):**
    *   **Duplicazione dei Record:** Il precedente sistema di sincronizzazione fallato ha causato la creazione di decine di rapportini identici (fino a 20 copie dello stesso report).
    *   **Relazioni Interrotte (Dati Orfani):** Molti rapportini hanno perso i collegamenti fondamentali con le anagrafiche. In particolare, mancano i collegamenti ai tecnici (`presenze`) e alle navi/luoghi, rendendo il dato incompleto e inutilizzabile.

2.  **Instabilità Totale del Frontend:**
    *   **Crash Sistematici:** L'applicazione va in crash continuo quando si tenta di visualizzare, modificare o eliminare un rapportino.
    *   **Causa Radice del Crash:** Il componente responsabile della visualizzazione della tabella (`RapportiniTable.tsx`) era un "fossile" della vecchia architettura. Si aspettava un modello dati obsoleto (es. `rapportino.cliente`) e non era in grado di interpretare la nuova struttura dati (es. `rapportino.naveId`, `rapportino.presenze`). Il tentativo di accedere a proprietà di oggetti inesistenti (es. `tecnico.nome` su un tecnico `null`) causava il crash irrecuperabile.

## Modello Operativo e di Permessi (Fonte di Verità)

L'analisi ha chiarito la divisione fondamentale dei ruoli tra le due applicazioni del sistema, che è la chiave per la corretta implementazione delle funzionalità:

*   **App Tecnici (sul campo):**
    *   **CREAZIONE:** Può creare nuovi rapportini completi di firma cliente.
    *   **MODIFICA:** Può modificare **solo e soltanto i rapportini da lui creati**.
    *   **ELIMINAZIONE:** **MAI**. La funzione di eliminazione è assente e proibita.
    *   **VISIBILITÀ:** Vede i propri rapportini e quelli in cui è stato inserito nell'elenco `presenze`.

*   **App Master (Ufficio / Amministrativa - questa):**
    *   **CREAZIONE:** Può creare rapportini per scopi amministrativi, ma **senza gestire la firma del cliente**.
    *   **MODIFICA:** **Sì, può modificare QUALSIASI rapportino** per correggere errori o dati mancanti.
    *   **ELIMINAZIONE:** **Sì, può eliminare QUALSIASI rapportino**, funzione fondamentale per la bonifica dei dati duplicati.
    *   **VISIBILITÀ:** Vede TUTTI i rapportini di tutti i tecnici, firme incluse.

## Piano di Bonifica Sequenziale (Formalizzato come FASE K nel Blueprint)

Per uscire da questa situazione critica, è stato definito un piano d'azione in 3 fasi sequenziali:

1.  **K.1 - Stabilizzazione Interfaccia:**
    *   **Azione:** Riscrivere il componente `RapportiniTable.tsx` per renderlo robusto e "difensivo". Deve interpretare correttamente la struttura dati definita in `report_tecnici.md` e non andare in crash in presenza di dati corrotti. I dati corrotti verranno evidenziati con un indicatore visivo.
    *   **Obiettivo:** Ottenere un'interfaccia stabile che permetta di visualizzare tutti i rapportini (corretti e corrotti) senza crash.

2.  **K.2 - Bonifica Dati Backend:**
    *   **Azione:** Sfruttando l'interfaccia stabilizzata, analizzare i dati su Firestore per identificare i rapportini duplicati e orfani. Eseguire, con conferma utente, operazioni chirurgiche di eliminazione.
    *   **Obiettivo:** Pulire la collezione `rapportini` su Firestore, lasciando solo dati coerenti e validi.

3.  **K.3 - Ripristino Funzionalità Amministrative:**
    *   **Azione:** Attivare e implementare in modo sicuro i pulsanti "Modifica" ed "Elimina" nell'App Master, collegandoli a Cloud Functions che verifichino i permessi di amministratore.
    *   **Obiettivo:** Fornire all'ufficio strumenti sicuri e affidabili per la gestione quotidiana dei dati.

---

## Analisi Dettagliata per Sezione (ARCHIVIATA)

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

# Piani di Ricostruzione (ARCHIVIATI)

*Questa sezione contiene i piani di ristrutturazione passati, superati dall'evoluzione della strategia e dalla scoperta di criticità più profonde.*

## Fase 0: Messa in Sicurezza delle Cloud Functions Esistenti
*   **STATO: FATTO.**

## Fase 1: Ristrutturazione del Sistema di Autenticazione e Permessi
*   **STATO: FATTO.**

## Fase 2: Creazione di un'API Sicura con Cloud Functions
*   **STATO: SUPERATO** dalla strategia globale.

## Fase 3: Ottimizzazione delle Performance e Refactoring del Data Fetching
*   **STATO: SUPERATO** dalla strategia globale.

## Fase 4: Pulizia e Finalizzazione
*   **STATO: SUPERATO** dalla strategia globale.

## NUOVO PIANO DI RISTRUTTURAZIONE: REPORTISTICA E SINCRONIZZAZIONE (SUPERATO)
*   **STATO: SUPERATO** dalla strategia globale del `DataHydrator` e dalla scoperta della dualità architetturale.

## AGGIORNAMENTO PIANO: Architettura Globale e Debito Tecnico (SUPERATO)
*   **STATO: SUPERATO** e completato con l'eliminazione di Dexie e la centralizzazione su Zustand.
