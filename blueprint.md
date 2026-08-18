# Blueprint Architetturale Unificato

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola del CIAO:** Ogni singolo messaggio in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.

---

## Obiettivo Strategico: Stabilità e Sicurezza

L'obiettivo primario è trasformare questa applicazione da un prototipo client-heavy, insicuro e instabile a un prodotto di livello enterprise. Questo sarà raggiunto attraverso la centralizzazione della logica di business sul backend (Firebase Cloud Functions), l'adozione di un unico e affidabile sistema di gestione dello stato (Zustand) e la messa in sicurezza di ogni singola operazione di scrittura (CRUD).

---

## Diagnosi Architetturale Consolidata

L'analisi ha rivelato criticità sistemiche che minano l'intera applicazione:

1.  **Falla di Sicurezza Fondamentale (SEC-1, SEC-2, SEC-3):** L'applicazione permetteva scritture dirette su Firestore dal client, bypassando qualsiasi controllo di sicurezza lato server. Il sistema di permessi basato sulla collezione `admins` era inaffidabile e scorretto, in favore dei **Custom Claims** di Firebase Auth, che rappresentano l'unica fonte di verità.

2.  **Dualità dello Stato (Debito Tecnico Grave):** L'applicazione operava con due sistemi di gestione dello stato in conflitto:
    *   **Legacy:** Un database locale su disco (Dexie.js), fonte di dati obsoleti, inconsistenti e di logica di sincronizzazione fallata.
    *   **Moderno:** Uno store globale in-memory (Zustand), popolato all'avvio (`DataHydrator`) con dati freschi e affidabili dal server.
    Questa divisione era la causa principale di bug, dati disallineati e instabilità generale.

3.  **Architettura Client-Heavy (PERF-1, PERF-2):** Enormi quantità di logica di business (join, aggregazioni, calcoli) venivano eseguite direttamente nel browser, causando un degrado significativo delle performance, specialmente in componenti come la Dashboard e la Reportistica.

---

## Piano di Refactoring Attivo

### **FASE K: Bonifica e Amministrazione Modulo Reportistica**

*   **STATO:** **IN CORSO.**
*   **OBIETTIVO:** Risolvere la corruzione dei dati nel backend (rapportini duplicati, relazioni interrotte), stabilizzare l'interfaccia utente per renderla "a prova di crash", e implementare le corrette funzionalità amministrative in linea con i ruoli definiti.

#### **Modello Operativo e di Permessi (Fonte di Verità)**

Sulla base delle ultime direttive, sono stati definiti i seguenti ruoli e permessi, che devono guidare lo sviluppo:

1.  **App Tecnici (sul campo):**
    *   **CREAZIONE:** Può creare nuovi rapportini completi di firma cliente.
    *   **MODIFICA:** Può modificare **solo e soltanto i rapportini da lui creati**.
    *   **ELIMINAZIONE:** **MAI**. La funzione di eliminazione è assente e proibita.
    *   **VISIBILITÀ:** Vede i propri rapportini e quelli in cui è stato inserito nell'elenco `presenze`.

2.  **App Master (Ufficio / Amministrativa - questa):**
    *   **CREAZIONE:** Può creare rapportini per scopi amministrativi, ma **senza gestire la firma del cliente**.
    *   **MODIFICA:** **Sì, può modificare QUALSIASI rapportino** per correggere errori o dati mancanti.
    *   **ELIMINAZIONE:** **Sì, può eliminare QUALSIASI rapportino**, funzione fondamentale per la bonifica dei dati duplicati.
    *   **VISIBILITÀ:** Vede TUTTI i rapportini di tutti i tecnici, firme incluse.

#### **Piano di Bonifica Sequenziale**

*   **K.1 - Stabilizzazione Interfaccia:**
    *   **AZIONE:** Riscrivere il componente `RapportiniTable.tsx` per renderlo robusto e "difensivo". Deve interpretare correttamente la struttura dati definita in `report_tecnici.md` e non andare in crash in presenza di dati corrotti (es. `naveId` o `tecnicoId` non più validi). I dati corrotti verranno evidenziati con un indicatore visivo.
    *   **RISULTATO:** Un'interfaccia stabile che permette di visualizzare tutti i rapportini, inclusi quelli "rotti", senza crashare. Questa stabilità è il prerequisito per la fase successiva.

*   **K.2 - Bonifica Dati Backend:**
    *   **AZIONE:** Sfruttando l'interfaccia stabilizzata, analizzare i dati su Firestore per identificare i gruppi di rapportini duplicati e quelli con relazioni interrotte. Eseguire, con conferma utente, operazioni chirurgiche di eliminazione tramite script o Cloud Functions amministrative.
    *   **RISULTATO:** La collezione `rapportini` su Firestore sarà pulita, coerente e priva di duplicati.

*   **K.3 - Ripristino Funzionalità Amministrative:**
    *   **AZIONE:** Attivare e implementare correttamente i pulsanti "Modifica" ed "Elimina" nell'interfaccia dell'App Master. Queste azioni dovranno invocare Cloud Functions sicure che verificano i permessi di amministratore dell'utente prima di eseguire l'operazione sul database.
    *   **RISULTATO:** L'App Master disporrà di strumenti sicuri e affidabili per la gestione e la manutenzione dei dati di reportistica.

---

## Debito Tecnico Identificato e Piano Strategico Futuro

### Criticità 1: Disomogeneità delle Regioni Cloud Functions

*   **STATO:** **PIANIFICATO.**
*   **OBIETTIVO STRATEGICO:** Unificare TUTTE le Cloud Functions in un'unica regione: `europe-west1`.
*   **PIANO A LUNGO TERMINE:** Migrazione controllata, aggiornamento coordinato dei client e decommissioning.

---

## Fasi di Refactoring Archiviate (COMPLETATE)

### **FASE J: Risoluzione Conflitto di Regioni (Correzione Tattica)**
*   **STATO:** COMPLETATA.
*   **AZIONE:** Modificato `src/services/SyncService.ts` per puntare esplicitamente a `us-central1`, risolvendo l'errore `FirebaseError: internal` e sbloccando la sincronizzazione delle anagrafiche.

### **Fase H: Correzione Errori di Build Residui**
*   **STATO:** COMPLETATA.

### **Fase G: Refactoring Finale della Pagina Presenze**
*   **STATO:** COMPLETATA.

### **Fase F: Eliminazione del Debito Tecnico Architetturale**
*   **STATO:** COMPLETATA.

### **Fase E: Risoluzione Errore di Avvio "Profilo non trovato"**
*   **STATO:** COMPLETATA.

### **Fase D: Sincronizzazione Anagrafiche**
*   **STATO:** COMPLETATA.

### **Fase B: Ristrutturazione della Logica di Sincronizzazione (Rapportini)**
*   **STATO:** SUPERATA E COMPLETATA dalla strategia del `DataHydrator` globale.

### **Fase A: Sicurezza e Stabilizzazione Immediata (Rapportini)**
*   **STATO:** COMPLETATA.

### **Fase 1 (pre-refactoring): Ristrutturazione del Sistema di Autenticazione e Permessi**
*   **STATO:** COMPLETATA.
