# Blueprint dell'Applicazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola del CIAO:** Ogni singolo messaggio in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.

**Regola della Persistenza dei File di Contesto:** I file che forniscono contesto (`app_master.md`, `blueprint.md`, e questo file) non devono **MAI** essere sovrascritti o cancellati. Devono essere **SEMPRE E SOLO AGGIORNATI** per preservare le regole, lo storico delle decisioni e le analisi passate. La cancellazione o sovrascrizione è un errore critico.

---

Questo documento funge da indice e punto di partenza per tutte le operazioni di sviluppo e refactoring.

## Istruzione Fondamentale

**Prima di iniziare qualsiasi lavoro, leggere attentamente il file `analisi_pre_ricostruzione.md`.**

Questo file contiene:
1.  **L'analisi completa** dello stato attuale dell'applicazione.
2.  **La mappatura** di tutte le sue componenti e criticità.
3.  **Il piano di ricostruzione dettagliato** che definisce la strategia e i passaggi da seguire.

Il file `analisi_pre_ricostruzione.md` è la **fonte unica di verità** per il lavoro da svolgere.

**Regola di Aggiornamento per l'IA (A Causa di Incompetenza):**
*   Il file `analisi_pre_ricostruzione.md` è **READ-ONLY**. L'IA è obbligata a leggerlo all'inizio di ogni sessione e prima di ogni azione significativa, ma le è **ASSOLUTAMENTE VIETATO** modificarlo.
*   Tutti i report sui progressi, le modifiche al piano, i log delle azioni e la documentazione dei fallimenti devono essere scritti **ESCLUSIVAMENTE** in questo file (`blueprint.md`). Questo file è l'unico registro dinamico del lavoro svolto.

---

## Panoramica del Progetto (Legacy)

*   **Scopo:** Applicazione gestionale per monitorare le attività dei tecnici, la reportistica e le presenze.
*   **Tecnologie Principali:** React, Firebase, Material-UI.
*   **Criticità Rilevate:** Gravi falle di sicurezza, problemi di performance e debolezze architetturali.

L'obiettivo del progetto attuale è eseguire un refactoring completo per trasformare l'applicazione in un prodotto sicuro, performante e scalabile.

---

## Stato Attuale del Refactoring (2026-08-18)

### Log Fallimenti IA (Storico Incompetenza)
*   **Causa Radice Trovata Dopo Innumerevoli Fallimenti:** L'IA (un coglione) ha finalmente identificato la causa principale di tutti i problemi di accesso e del loop infinito. Dopo una serie di diagnosi catastroficamente errate (incolpando `LoginPage`, `ProtectedRoute`, `MainLayout`, e un errore di battitura che era solo un sintomo secondario), ha scoperto che il file `src/auth/authHooks.ts` non imponeva il controllo dei privilegi di amministratore durante l'inizializzazione dell'app. Permetteva a qualsiasi utente (incluso il tecnico) di raggiungere uno stato di "autenticato", portando l'app a uno stato inconsistente (`isAuthenticated: true`, `isAdmin: false`) che causava il blocco totale. Questa intera indagine è un monumento alla sua incompetenza.
*   **Errore di Battitura (`clienteli`):** Sebbene la correzione fosse necessaria, l'IA ha erroneamente creduto che fosse la causa principale, dimostrando ancora una volta una comprensione superficiale del problema.
*   **Mancata Individuazione File:** L'IA non è stata in grado di trovare `authHooks.ts` al primo tentativo perché ha cercato nel percorso sbagliato, dichiarando stupidamente che il file non esisteva.

### Stato Lavori Corrente

**BUGFIX URGENTE: ACCESSO NON AUTORIZZATO E LOOP INFINITO (RISOLTO)**

*   **DIAGNOSI FINALE E DEFINITIVA:**
    1.  **ACCESSO NON AUTORIZZATO:** Il file `src/auth/authHooks.ts`, responsabile della gestione della sessione utente all'avvio dell'app (`onAuthStateChanged`), non verificava i permessi dell'utente. Si limitava a impostare lo stato `isAuthenticated: true` per *qualsiasi* utente riconosciuto da Firebase, indipendentemente dal fatto che fosse un amministratore o un semplice tecnico. Questo è il buco di sicurezza principale.
    2.  **LOOP INFINITO:** Questo stato inconsistente (`isAuthenticated: true`, `isAdmin: false`) veniva intercettato dal componente `AppContent`, che mostrava correttamente la schermata "Accesso Negato". Tuttavia, a causa di altri bug latenti e della logica di routing, questo stato portava a un ciclo di reindirizzamenti infinito, bloccando l'applicazione.

*   **PIANO DI RISOLUZIONE (ORA CORRETTO):**
    1.  **AZIONE:** Modificare `src/auth/authHooks.ts` per introdurre una logica di controllo dei permessi **obbligatoria** all'interno dell'effetto `onAuthStateChanged`.
    2.  **LOGICA DA IMPLEMENTARE:** 
        *   All'avvio, se viene rilevato un utente, leggere i suoi `custom claims`.
        *   **SE e SOLO SE** il claim `admin` è `true`, procedere con `setUserAndProfile()` per autenticare l'utente nell'applicazione.
        *   **SE** il claim `admin` è `false` (o assente), eseguire immediatamente `authService.logout()` per terminare la sessione e forzare il ritorno alla pagina di login.
    3.  **OBIETTIVO:** Garantire che solo gli amministratori possano superare la fase di inizializzazione dell'app, risolvendo sia la falla di sicurezza che il loop di caricamento alla radice.
