# Blueprint: R.I.SO. Management App

## 1. Panoramica del Progetto

**Scopo:** Creare un'applicazione web gestionale interna (per ora denominata "R.I.SO. App") per la gestione di rapportini di lavoro, anagrafiche (tecnici, clienti, etc.), scadenze e altre attività operative. L'applicazione è costruita utilizzando React, Vite, TypeScript e Material-UI, con Firebase come backend per l'autenticazione e il database (Firestore).

**Obiettivo:** Sviluppare un'interfaccia moderna, reattiva, intuitiva e stabile che ottimizzi i flussi di lavoro aziendali, riduca l'inserimento manuale dei dati e fornisca una visione chiara delle attività in corso.

---

## 2. Architettura e Stack Tecnologico

*   **Frontend Framework:** React 19 con Vite e TypeScript.
*   **Component Library:** Material-UI (MUI) per un design system coerente e accessibile.
*   **Routing:** `react-router-dom` per la navigazione client-side.
*   **State Management:** 
    *   `useState` e `useReducer` per lo stato locale dei componenti.
    *   `useContext` (AuthProvider) per la gestione dello stato di autenticazione globale.
*   **Backend & Database:** Firebase (Authentication, Firestore, Cloud Functions).
*   **Hosting:** Firebase Hosting.
*   **Linting:** ESLint con configurazione specifica per TypeScript e React.
*   **Styling:** Emotion (integrato con Material-UI).
*   **Date & Time:** `dayjs` per la manipolazione e formattazione delle date.

---

## 3. Funzionalità Implementate

### 3.1. Autenticazione e Layout

*   **Flusso di Autenticazione Completo:**
    *   **Pagina di Login:** Un form per l'inserimento di email e password (`src/pages/LoginPage.tsx`).
    *   **Integrazione con Firebase Auth:** La logica di login utilizza il servizio di autenticazione di Firebase.
    *   **Gestione della Sessione:** Lo stato dell'utente (loggato/non loggato) è gestito globalmente tramite un `AuthContext` (`src/contexts/AuthContext.tsx`).
*   **Routing Protetto (`ProtectedRoute`):**
    *   Le pagine sensibili sono protette. Se un utente non autenticato tenta di accedervi, viene reindirizzato alla pagina di login.
    *   La pagina di login è inaccessibile a un utente già autenticato.
*   **Layout Principale (`MainLayout`):
    *   **Sidebar di Navigazione:** Un menu laterale persistente (`src/components/Sidebar.tsx`) che mostra le sezioni principali dell'app.
    *   **Header:** Una barra superiore (`src/components/Header.tsx`) con il titolo della pagina e controlli utente (es. logout).

### 3.2. Pagine e Sezioni

*   **Dashboard (`DashboardPage.tsx`):**
    *   La pagina principale dopo il login.
    *   Mostra un riepilogo visivo dei dati più importanti.

### 3.3. Configurazione dell'Ambiente di Sviluppo

*   **Pulizia del Progetto:** Sono state rimosse le cartelle obsolete.
*   **Setup di ESLint:** È stato configurato ESLint per garantire la qualità e la consistenza del codice.

---

## 4. Architettura di Provisioning Utenti (Soluzione Definitiva)

### 4.1. Problema Rilevato

È stata identificata una debolezza architetturale critica nel processo di creazione dei tecnici. Il flusso precedente creava un documento nella collezione `tecnici` con un ID casuale autogenerato da Firestore. Successivamente, un processo separato creava un utente in Firebase Authentication. Questo generava una discrepanza tra l'ID del documento (`doc.id`) e l'ID utente dell'autenticazione (`auth.uid`), violando le regole di sicurezza server-side che richiedono la corrispondenza tra questi due ID per autorizzare l'accesso.

### 4.2. Soluzione Implementata: `provisionTecnico` Cloud Function

Per risolvere il problema in modo permanente, è stata implementata una nuova architettura basata su una Cloud Function (`https://...onCall`) chiamata `provisionTecnico`.

**Flusso di Lavoro:**

1.  **Chiamata dal Frontend:** Il form di creazione di un nuovo tecnico non interagisce più direttamente con Firestore. Invece, chiama la Cloud Function `provisionTecnico`, passando i dati del profilo del nuovo tecnico, inclusa l'email.
2.  **Esecuzione Atomica sul Server:** La Cloud Function esegue le seguenti azioni in modo atomico e sicuro:
    *   Verifica se un utente con quella email esiste già in Firebase Authentication. In caso contrario, lo crea.
    *   Recupera l'**UID** dell'utente appena creato o esistente.
    *   Crea (o aggiorna con `merge: true`) un documento nella collezione `tecnici` utilizzando l'**UID** come **ID del documento**.
    *   Salva l'UID e l'email anche come campi all'interno del documento stesso per coerenza.
3.  **Gestione Password:** Una volta che la Cloud Function ha avuto successo e ha restituito l'UID e l'email, il frontend utilizza il servizio standard di Firebase Auth per inviare un'email di reset/impostazione password all'utente, mantenendo il flusso di gestione password esistente.

**Vantaggi:**

*   **Coerenza Garantita:** L'ID del documento in Firestore corrisponde sempre all'UID dell'utente in Authentication.
*   **Sicurezza:** La logica di creazione è centralizzata sul server, protetta da autenticazione.
*   **Affidabilità:** Il processo è atomico, riducendo il rischio di stati di dati inconsistenti.

### 4.3. Bonifica dei Dati Esistenti (Azione Manuale Post-Deploy)

Per allineare tutti gli utenti alla nuova architettura, è richiesta un'azione manuale una tantum: tutti i tecnici esistenti devono essere eliminati e ricreati utilizzando il nuovo flusso di creazione. Questo va fatto **dopo** che le modifiche al codice sono state deployate.

---

## 5. Piano di Sviluppo Attuale

*   **Stato:** Stabile, ma con un'architettura di creazione utenti non sicura.
*   **Obiettivo Corrente:** Implementare la nuova architettura di provisioning utenti tramite la Cloud Function `provisionTecnico` e aggiornare il frontend per utilizzarla. Successivamente, eseguire la bonifica dei dati esistenti.

---

## **SVOLTA CRITICA E NUOVO PIANO STRATEGICO (Diagnosi Problema di Autenticazione)**

### Analisi e Causa Radice

Dopo un'approfondita investigazione, è stato identificato un **blocco architetturale critico** che impediva qualsiasi progresso. L'errore di autenticazione (`auth/invalid-credential`) non era un bug nell'app 'tecnici', ma un sintomo di una profonda incoerenza nel modo in cui l'applicazione 'master' crea e gestisce i profili utente.

**Problema:** L'app 'master' creava i documenti dei tecnici in Firestore con un ID documento casuale, mentre le regole di sicurezza di Firestore richiedono che l'ID del documento corrisponda all'UID dell'utente autenticato per consentire l'accesso. Questo conflitto rendeva impossibile per l'app 'tecnici' leggere i dati del profilo utente dopo il login.

### Soluzione Architetturale Definitiva

È stata definita una soluzione definitiva che deve essere implementata nell'applicazione **'master'**. Questa soluzione risolve il problema alla radice per tutti gli utenti.

1.  **Implementazione di una Cloud Function (`provisionTecnico`):** L'app 'master' utilizzerà una Cloud Function sicura per creare/abilitare i tecnici. Questa funzione garantirà che l'utente venga creato prima in Firebase Authentication per ottenere un `UID`, e che questo `UID` venga poi usato come **ID del documento** in Firestore.
2.  **Modifica del Frontend 'master':** Il form di creazione dei tecnici nell'app 'master' chiamerà questa Cloud Function, eliminando il processo manuale e il rischio di errori.
3.  **Bonifica dei Dati Esistenti:** Tutti i profili dei tecnici esistenti nell'app 'master' dovranno essere ricreati con il nuovo processo per allineare i loro dati alla nuova architettura.

---

## **ANALISI COSTI E PIANO DI OTTIMIZZAZIONE OBBLIGATORIO**

### Diagnosi: Costi Insostenibili e Causa Radice

È emerso un secondo blocco critico, questa volta di natura economica. Una spesa di ~100€ in una fase di sviluppo con utilizzo minimo è un segnale di allarme che indica un'architettura di lettura dati inefficiente e non scalabile.

**Causa:** La pagina `PresenzePage.tsx` dell'app 'master' scarica l'intera lista di tecnici e l'intera collezione di rapportini del mese selezionato per effettuare calcoli e aggregazioni **lato client (nel browser)**. Questo genera un numero spropositato di letture (centinaia per ogni visualizzazione di pagina), che è la causa diretta dei costi elevati. Se non corretto, con 30+ tecnici attivi, la spesa mensile esploderebbe a cifre insostenibili (migliaia di euro).

### Soluzione Strategica: Aggregazione Dati Lato Server

Per ridurre i costi a un livello nominale (stimato < 10€/mese anche con 60 tecnici), è obbligatorio spostare l'elaborazione dal client al server.

1.  **Creazione di una Collezione Aggregata:** Verrà creata una nuova collezione in Firestore, `reportMensiliAggregati`. Ogni documento rappresenterà un mese (es. ID `2024-10`) e conterrà i dati sulle presenze già pre-calcolati e pronti per la visualizzazione.
2.  **Implementazione di una Cloud Function di Aggregazione:** Una Cloud Function si attiverà alla creazione/modifica/eliminazione di un rapportino e aggiornerà in tempo reale il documento aggregato corrispondente. Questa operazione ha un costo marginale.
3.  **Refactoring della `PresenzePage.tsx`:** La pagina nell'app 'master' verrà modificata per leggere **un solo documento** (`reportMensiliAggregati/<mese-anno>`) invece di centinaia. Questo ridurrà il costo di lettura della pagina di oltre il 99%.
