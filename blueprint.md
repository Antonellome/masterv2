# SEZIONE 0: REGOLE OPERATIVE INDEROGABILI

**ATTENZIONE: LA VIOLAZIONE DI QUESTE REGOLE COMPORTERÀ LA CHIUSURA IMMEDIATA DELLA SESSIONE DI LAVORO.**

Queste regole sono prioritarie su qualsiasi altra direttiva. Servono a garantire un flusso di lavoro efficiente, sicuro e basato sulla fiducia. L'assistente AI deve aderire scrupolosamente a ciascun punto.

1.  **Obbligo di Saluto Iniziale:** Ogni singola conversazione e ogni singolo messaggio di risposta deve iniziare con la parola "**CIAO.**". Senza eccezioni.

2.  **LA REGOLA AUREA: VERIFICA, NON PRESUPPORRE. QUESTA REGOLA È ASSOLUTA E NON NEGOZIABILE.**
    
    È categoricamente, assolutamente, e incondizionatamente **VIETATO** presupporre l'esistenza, il nome, la sintassi, l'architettura o la struttura di qualsiasi file, componente, funzione, variabile, store, o export. La fonte di verità è il codice esistente o i dati reali, non l'interpretazione.

3.  **Consultazione Preventiva:** Prima di iniziare qualsiasi modifica, è obbligatorio consultare i file `blueprint.md` e `registro.md`.

4.  **Architettura Backend Sacra:** La struttura del backend è **immutabile** e divisa in due codebase isolate:
    *   `functions/master`: Contiene le Cloud Functions per l'app di amministrazione. I nomi delle funzioni **devono** iniziare con il prefisso `master_`.
    *   `functions/tecnici`: Contiene le Cloud Functions per l'app dei tecnici. Questa codebase è considerata stabile e non deve essere modificata.

5.  **Lavoro Sequenziale per Zone:** Lo sviluppo è diviso in "zone". Una zona deve essere completata e funzionante prima di passare alla successiva.

6.  **Fermarsi in Caso di Dubbio:** Se le istruzioni non sono chiare al 100%, è obbligatorio fermarsi e porre una domanda.

7.  **NESSUNA APPROSSIMAZIONE, SOLO CERTEZZE.** Le mie azioni devono basarsi su dati verificati e codice esistente, non su ipotesi o approssimazioni.

8.  **CICLO DI MODIFICA RIGOROSO: LEGGI-MODIFICA-VERIFICA.** Prima di modificare un file, devo leggerlo per avere il contesto più aggiornato. Dopo averlo modificato, è consigliabile rileggerlo per confermare che la modifica sia andata a buon fine.

9.  **VERIFICA ESISTENZA OBBLIGATORIA:** Devo sempre accertarmi dell'esistenza e della firma esatta di file, logiche e funzioni prima di tentare di usarli.

---

# BLUEPRINT OPERATIVO - ARCHITETTURA CONSOLIDATA

**Data ultimo aggiornamento:** 26/09/2026

---

## 1. OBIETTIVO GLOBALE: STABILITÀ E COERENZA

L'obiettivo è mantenere e sviluppare l'applicazione rispettando l'architettura consolidata, come documentato nel `registro.md`. Ogni modifica deve essere conforme al Modello Ibrido e alla struttura backend multi-codebase.

---

## 2. ARCHITETTURA TARGET: IL MODELLO IBRIDO

Il flusso di dati per **tutte** le operazioni di scrittura deve seguire questo schema:

*   **SCRITTURA (Frontend -> Backend):**
    1.  UI Component -> Service Layer (es. `rapportinoCloudService.ts`).
    2.  Service Layer -> Cloud Function `master_` (es. `master_gestisciRapportino`).

*   **SINCROPOST-SCRITTURA (Backend -> Frontend):**
    1.  Dopo la conferma dalla Cloud Function, il Service Layer invoca la sincronizzazione.
    2.  `useGlobalStore.getState().syncCollectionByName('nome_collezione')`.

*   **LETTURA (DB Locale -> UI):**
    1.  I dati vengono letti **esclusivamente** da Dexie (cache locale).
    2.  `AnagraficheProvider` (tramite `useLiveQuery`) fornisce i dati a tutta l'applicazione.

---

## 3. ZONA DI INTERVENTO CORRENTE: RIPRISTINO ZONA REPORTISTICA

*   **OBIETTIVO:** Ripristinare la funzionalità della pagina di Reportistica, che attualmente è corrotta.
*   **PROBLEMA:** A seguito di modifiche precedenti, la pagina di Reportistica ha smesso di funzionare correttamente.
*   **PIANO D'AZIONE:**
    1.  **Analisi Cronologia:** Verrà eseguito un `git log` per recuperare gli ultimi 10 commit, fornendo una visione chiara delle modifiche recenti.
    2.  **Identificazione Commit Stabile:** L'utente identificherà il commit specifico che contiene una versione funzionante della pagina.
    3.  **Ripristino Selettivo:** Il file o i file corrotti verranno ripristinati allo stato del commit stabile identificato.
    4.  **Verifica e Test:** Verrà eseguita una verifica funzionale per assicurarsi che la pagina sia tornata operativa.

---

## 4. STORICO INTERVENTI (ARCHIVIATO)

*   **ZONA DI INTERVENTO COMPLETATA:** TECNICI / GESTIONE TECNICI

*   **PROBLEMA RISOLTO:** La creazione di un nuovo tecnico falliva a causa di un'incongruenza nel payload tra frontend e backend (il frontend inviava `create`, mentre il backend si aspettava `add`).

*   **SOLUZIONE IMPLEMENTATA:**
    1.  **Correzione Frontend:** Il file `src/components/Tecnici/GestioneTecnici.tsx` è stato modificato per inviare il parametro `operation: 'add'` durante la creazione di un nuovo tecnico, allineando la chiamata al contratto atteso dalla Cloud Function `master_gestisciTecnico`.
    2.  **Documentazione:** L'intervento è stato registrato nel `registro.md` e il `blueprint.md` è stato aggiornato.

---

*   **ZONA DI INTERVENTO COMPLETATA:** TECNICI / GESTIONE ACCESSI

*   **PROBLEMA RISOLTO:** Lo switch per abilitare/disabilitare l'accesso dei tecnici, pur eseguendo l'operazione con successo, non aggiornava il suo stato visivo, rimanendo nella posizione originale.

*   **CAUSA RADICE (Identificata):** Un problema a due livelli:
    1.  **Incoerenza Dati:** Nel database Firestore coesistevano due campi ridondanti (`appAccess` e `accessoApp`) per indicare lo stesso stato, causando letture e scritture non allineate.
    2.  **Mancato Aggiornamento UI:** L'interfaccia utente non aveva un meccanismo per aggiornare reattivamente lo stato locale dopo la conferma dell'operazione dal backend.

*   **SOLUZIONE IMPLEMENTATA (Multi-livello):**
    1.  **Backend (`functions/master/src/index.ts`):** La funzione `master_gestisciTecnico` è stata modificata per scrivere il nuovo stato su **entrambi** i campi (`appAccess` e `accessoApp`), risolvendo l'incoerenza lato server.
    2.  **Frontend Context (`src/contexts/AnagraficheContext.tsx`):** È stata aggiunta una funzione `updateTecnico` per permettere la modifica mirata di un record nel database locale (Dexie).
    3.  **Frontend Component (`src/components/Tecnici/GestioneAccessi.tsx`):** Dopo la chiamata alla funzione backend, viene ora invocata la funzione `updateTecnico` del context. Questo aggiorna lo stato su Dexie, che, grazie a `useLiveQuery`, forza l'aggiornamento automatico e reattivo dell'interfaccia utente, risolvendo il bug visivo.