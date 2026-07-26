# Mappa Concettuale Applicazione "Gestione Lavoro SRL" (app_master.md)

**Scopo del Documento:** Questo documento è la fonte unica della verità sull'architettura, la logica e il flusso dei dati dell'applicazione. Nasce dalla necessità di eliminare incertezze, errori ripetuti e "lavori inutili". Ogni futura modifica o correzione dovrà obbligatoriamente partire dalla consultazione di questa mappa. L'analisi è certosina, file per file, senza dare nulla per scontato.

---

## **Metodologia di Analisi**

*(Omissis)*

---

## **Principi Architettonici Fondamentali**

*(Omissis)*

---

## **Principi di Sincronizzazione Offline-First**

Questa sezione definisce il contratto architetturale per la gestione dei dati tra il client e il server, basato su un rigoroso pattern offline-first.

1.  **Offline-First Assoluto:** L'applicazione legge e scrive **esclusivamente** sul database locale (Dexie.js). L'interfaccia utente non deve mai dipendere da una connessione di rete attiva per le operazioni di base (lettura, modifica, creazione).

2.  **Sincronizzazione come Unica Via:** L'unico punto di contatto con Firestore è una funzione di sincronizzazione centralizzata. Nessun altro componente, hook o servizio deve eseguire query dirette a Firestore (`getDocs`, `onSnapshot`, etc.). Questo centralizza la logica di rete e previene comportamenti incoerenti.

3.  **Sincronizzazione Incrementale:** La sincronizzazione deve essere incrementale per minimizzare il traffico di rete e i costi. Si basa su un timestamp (`lastSync` o simile) per scaricare solo i documenti creati o modificati dall'ultima sincronizzazione riuscita. Questo si applica a **tutte** le collezioni.

4.  **Trigger di Sincronizzazione:** La sincronizzazione viene attivata nei seguenti scenari:
    *   **All'avvio dell'applicazione:** Una sincronizzazione iniziale viene eseguita dopo che l'utente si è autenticato, per garantire che i dati locali siano aggiornati.
    *   **Dopo una scrittura locale (Push-to-Sync):** Ogni volta che viene creato, modificato o eliminato un documento nel database locale, viene attivata una sincronizzazione per inviare ("pushare") la modifica a Firestore.
    *   **Periodicamente:** Una sincronizzazione di controllo viene eseguita a intervalli di tempo regolari (es. ogni 15-30 minuti) per recuperare eventuali modifiche avvenute su altri dispositivi, senza essere troppo aggressiva.
    *   **Manualmente:** L'utente può forzare una sincronizzazione in qualsiasi momento tramite un controllo esplicito nell'interfaccia (es. il pulsante "freccia tonda" nell'AppBar).

---

## **Elenco delle Criticità Architetturali e Funzionali Rilevate**

*   **[C-1] Logica di Sincronizzazione Collocata in Modo Improprio:**
    *   **Stato:** **NON RISOLTO - CRITICITÀ BASSA.**

*   **[C-2] Incoerenza degli Indici nel Database Locale:**
    *   **Stato:** **RISOLTO**.

*   **[C-3] Sincronizzazione Anagrafiche NON Incrementale:**
    *   **Stato:** **RISOLTO**.

*   **[C-4] Eliminazione Diretta Online che Viola il Pattern Offline-First:**
    *   **Stato:** **NON RISOLTO - CRITICITÀ MEDIA.**

*   **[C-5] Bug Funzionale Grave in Cumulativi Tecnici:**
    *   **Stato:** **RISOLTO (Logica di calcolo corretta, in attesa di refactoring visuale).**

*   **[C-6] Violazione Totale del Pattern Offline-First in Analisi Ore:**
    *   **File:** `src/components/Reportistica/AnalisiOre.tsx`
    *   **Descrizione:** L'intero componente opera con query dirette a Firestore, ignorando completamente il database locale Dexie.js. Questo non solo rende la funzionalità inutilizzabile offline, ma contraddice l'intera architettura applicativa.
    *   **Stato:** **NON RISOLTO - CRITICITÀ MASSIMA.**

*   **[C-7] Bug Critico in Generazione PDF in Ricerca Avanzata:**
    *   **File:** `src/components/Reportistica/RicercaAvanzata.tsx`
    *   **Descrizione:** Un errore `TypeError: Cannot read properties of undefined` si verificava cliccando l'icona di stampa su una riga. Il codice tentava di accedere a mappe di dati anagrafici (`naviMap`, `luoghiMap`, etc.) che potevano essere `undefined` durante il rendering, causando il crash dell'applicazione.
    *   **Stato:** **RISOLTO**.

---

## **Analisi Gerarchica dei Componenti**

**Stato Analisi:** Completata la Fase 5, analisi completa della sezione Reportistica.

### **Fase 1-4: Struttura Globale, Contesti, Pagine e Servizi**

*(Omissis)*

### **Fase 5: Analisi Completa della Sezione di Reportistica**

Questa sezione aggrega tutte le funzionalità di analisi e visualizzazione dei dati di lavoro.

#### **5.1 `src/pages/ReportisticaPage.tsx`**
*   **Scopo:** Agisce come contenitore principale e orchestratore della UI per la sezione di reportistica.
*   **Logica & Struttura:**
    1.  **Navigazione a Schede (Tabs):** Utilizza un componente `Tabs` di Material-UI per organizzare e visualizzare i diversi pannelli di reportistica.
    2.  **Contenuti:** Ogni scheda renderizza uno dei seguenti componenti specializzati: `RicercaAvanzata`, `ReportMensili`, `CumulativiTecnici`, `AnalisiOre`.
    3.  **Azione Rapida:** Include un pulsante "Aggiungi" (`IconButton` con `AddIcon`) che permette di navigare direttamente alla creazione di un nuovo rapportino (`/rapportino/edit/new`), garantendo un accesso rapido alla funzione principale di inserimento dati.
*   **Criticità Rilevate:** Nessuna. Il componente è un contenitore di layout ben strutturato.

#### **5.2 `src/components/Reportistica/RicercaAvanzata.tsx`**
*   **Scopo:** Fornire una tabella interattiva per la ricerca, visualizzazione e gestione di **singoli rapportini**. È il componente principale per le operazioni quotidiane sui dati.
*   **Logica & Struttura:**
    1.  **Fonte Dati Offline:** Legge tutti i rapportini e le anagrafiche direttamente dal database locale (Dexie.js) tramite `useLiveQuery` e il `DataContext`, garantendo il funzionamento offline.
    2.  **Elaborazione Dati:** Utilizza `useMemo` per creare una versione "arricchita" dei rapportini (`flatRapportini`), dove gli ID vengono sostituiti con i nomi corrispondenti (tecnici, navi, clienti, etc.). Questa è la fonte dati della tabella.
    3.  **Funzionalità:** Offre filtri completi, modifica, eliminazione e stampa/condivisione del PDF del singolo rapportino.
*   **Criticità Rilevate:** **[C-7] RISOLTA.** Il componente è ora stabile.

#### **5.3 `src/components/Reportistica/ReportMensili.tsx`**
*   **Scopo:** Generare un report mensile dettagliato per un **singolo tecnico selezionato**.
*   **Logica & Struttura:**
    1.  **Fonte Dati Offline:** Utilizza `useLiveQuery` per leggere tutti i dati necessari da Dexie.js.
    2.  **Logica di Calcolo Complessa e Autonoma:** Implementa una funzione `calculateReportData` che aggrega i dati del tecnico per il mese scelto. Questa logica è molto specifica:
        *   Gestisce il modello dati ibrido (vecchio/nuovo).
        *   Suddivide le ore "lavorabili" in ordinarie (prime 8) e straordinarie (eccedenti).
        *   Identifica e aggrega separatamente ore notturne (regola speciale "Cartour"), straordinari espliciti e altre causali (Ferie, Malattia, etc.), creando colonne dinamiche nella tabella.
    3.  **Output:** Visualizza una tabella di riepilogo giornaliero e totali aggregati. Permette l'esportazione in un file PDF ben formattato.
*   **Criticità Rilevate:** Nessuna. Il componente è funzionale e autonomo.

#### **5.4 `src/components/Reportistica/CumulativiTecnici.tsx`**
*   **Scopo:** Generare una **tabella pivot** che mostra le ore di **tutti i tecnici** (o un sottogruppo filtrato) per ogni giorno del mese selezionato.
*   **Logica & Struttura:**
    1.  **Logica di Calcolo Definitiva:** La logica di aggregazione delle ore è stata corretta per gestire il modello ibrido e prevenire il doppio conteggio, risolvendo la criticità **[C-5]**.
    2.  **Formattazione Visuale a Codici:** Il componente implementa già la logica `formatCellData` per trasformare i totali di ore giornalieri in una stringa codificata (es. "8", "8+4", "F8", "M8", etc.), come definito nel `blueprint.md`.
    3.  **Esportazione Avanzata:** Include funzionalità per esportare la tabella pivot sia in formato **Excel (.xlsx)** che **PDF**. L'export Excel è particolarmente ricco, con formattazione condizionale (weekend, righe G-Tech), header multi-riga e una legenda incorporata.
*   **Criticità Rilevate:** La criticità funzionale **[C-5]** è risolta. Il componente è ora in attesa del **refactoring visuale** pianificato nel `blueprint.md` per perfezionare la user experience.

#### **5.5 `src/components/Reportistica/AnalisiOre.tsx`**
*   **Scopo:** Fornire una dashboard di analisi dei costi e delle ore lavorate, con grafici e totali aggregati.
*   **Logica & Struttura:**
    1.  **Fonte Dati Online:** Il componente si basa esclusivamente su `useCollectionData` e `getDocs` che interrogano **direttamente Firestore**. Questa è la causa della criticità **[C-6]**.
    2.  **Filtraggio Misto:** La logica di filtro è ibrida e inefficiente. Filtra per data su Firestore, ma poi esegue tutti gli altri filtri (per categoria, cliente, nave, etc.) sul client.
*   **Criticità Rilevate:** **[C-6] NON RISOLTA**. Il componente è un'anomalia architetturale che deve essere completamente riscritta per utilizzare la fonte dati locale (Dexie.js) e allinearsi al pattern offline-first dell'applicazione.

---

**Prossimo Passo Operativo:** Concentrarsi sul refactoring visuale e funzionale del componente `CumulativiTecnici.tsx`, come dettagliato nel `blueprint.md` e confermato da questa analisi.
