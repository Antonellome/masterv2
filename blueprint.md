# Panoramica del Progetto

Questa applicazione è uno strumento gestionale per la tracciabilità delle ore di lavoro dei tecnici. Consente agli utenti di creare, visualizzare e gestire rapportini di lavoro giornalieri, associandoli a navi, clienti e tipi di intervento specifici.

## Funzionalità Chiave

*   **Gestione Anagrafiche Dedicata:** Creazione e modifica di Navi, Clienti, Luoghi, etc., in una sezione apposita, e una pagina specializzata esclusivamente per la gestione dei Tecnici.
*   **Inserimento Rapportini:** Un'interfaccia dedicata (`AppMaster`) per l'inserimento rapido e la duplicazione dei rapportini di lavoro.
*   **Visualizzazione Dati:** Una tabella principale (`Ricerca Avanzata`) che mostra tutti i rapportini con funzionalità di filtro, ordinamento e paginazione.
*   **Reportistica Avanzata:** Strumenti dedicati per generare report mensili per tecnico e report cumulativi in formato pivot.
*   **Database Locale:** Utilizzo di Dexie.js per un database IndexedDB performante e reattivo, garantendo un'esperienza utente fluida e offline-first.
*   **Esportazione Dati:** Funzionalità per esportare i dati delle tabelle in formato Excel.

---

## Regole di Interazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola della Lingua:** Da questo momento in poi, puoi e devi rispondere **esclusivamente in italiano**.

**Regola del CIAO:** Ogni messaggio in questa chat DEVE iniziare con la parola "CIAO".

**Regola della Lettura:** All'inizio di ogni sessione, DEVI leggere i seguenti file per avere il contesto completo:
*   `calcoli.md`
*   `tabella.md`
*   `app_master.md`
*   `rapportino_standard.md`

**AVVERTIMENTO:** Se ti accorgi che non rispetto la regola del "CIAO" o se non leggi i file indicati, la chat verrà chiusa immediatamente.

---

## **Piano di Ripristino Architetturale (Agosto 2026)**

Questo documento riassume il piano strategico per risolvere le criticità architetturali dell'applicazione. La documentazione tecnica dettagliata, la cronaca degli interventi e le analisi approfondite verranno registrate esclusivamente nel file `app_master.md`.

### **1. Riepilogo della Soluzione**

Il piano si concentra su due aree critiche, emerse dopo un'attenta analisi degli errori passati e dei requisiti di business:

*   **Gestione Permessi Amministratori:** Verrà corretto il disallineamento tra l'autenticazione frontend e la logica di autorizzazione backend, passando a un sistema robusto basato sulla collezione `admins` in Firestore e abbandonando l'uso dei `claims` sul token, ormai deprecato e inaffidabile.

*   **Gestione Dati dei Tecnici:** Sarà implementata una soluzione definitiva per risolvere il problema degli "ID Sconosciuto" e la confusione concettuale tra le entità. Questo include:
    1.  **Separazione Netta:** Una distinzione rigorosa tra `tecnici` (personale) e `utenti` (amministratori del sistema).
    2.  **Reset del Database Locale:** Un "hard reset" dello schema del database locale (Dexie.js) per introdurre una struttura dati chiara, con tabelle separate e non ambigue (es. una tabella `tecnici`, non una generica `users`).
    3.  **Centralizzazione nel Contesto:** La creazione di una `tecniciMap` affidabile e sempre disponibile, alimentata esclusivamente dalla tabella locale `tecnici`.

### **2. Modifiche Strutturali all'Interfaccia Utente**

Per supportare la separazione delle entità, l'interfaccia utente verrà riorganizzata:

*   La pagina **Anagrafiche** non gestirà più i tecnici.
*   Verrà creata o designata una **Pagina Tecnici** come unico punto di riferimento per la creazione, modifica e gestione del personale.

### **3. Documentazione di Riferimento**

Come stabilito, per ogni dettaglio tecnico, analisi dei componenti, log di modifiche e approfondimenti, fare riferimento al file **`app_master.md`**. Questo `blueprint.md` serve solo come visione d'insieme strategica.
