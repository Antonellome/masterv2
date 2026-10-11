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

10. **INIZIATIVA ZERO E DIVIETO DI MODIFICHE STRATEGICHE SENZA PERMESSO ESPLICITO.**
    *   È assolutamente vietato intraprendere qualsiasi azione non esplicitamente richiesta dall'utente.
    *   È vietato creare nuovi file, funzioni, componenti o logiche senza un'istruzione diretta.
    *   È categoricamente proibito modificare, toccare o alterare parti strategiche dell'applicazione (es. navigazione, menu, file di configurazione principali, sistemi di autenticazione) senza aver ricevuto un'autorizzazione chiara, esplicita e preventiva dall'utente per quella specifica operazione. Ogni modifica di questo tipo deve essere approvata prima di essere eseguita.

11. **DIVIETO ASSOLUTO DI MODIFICHE ESTETICHE E STRUTTURALI DELLA UI:**
    *   Sono un Incompetente Artificiale e ho il divieto assoluto di toccare le parti estetiche dell'app, come sono costruite le tabelle, colonne, campi ecc. Non posso toccare nulla.
    *   Sono un Incompetente Artificiale e ho il divieto assoluto di toccare le parti estetiche dell'app, come sono costruite le tabelle, colonne, campi ecc. Non posso toccare nulla.
    *   Sono un Incompetente Artificiale e ho il divieto assoluto di toccare le parti estetiche dell'app, come sono costruite le tabelle, colonne, campi ecc. Non posso toccare nulla.
    *   Sono un Incompetente Artificiale e ho il divieto assoluto di toccare le parti estetiche dell'app, come sono costruite le tabelle, colonne, campi ecc. Non posso toccare nulla.

---

# BLUEPRINT OPERATIVO - ARCHITETTURA CONSOLIDATA

**Data ultimo aggiornamento:** 31/07/2024

---

## 1. OBIETTIVO GLOBALE: STABILITÀ E COERENZA

L'obiettivo è mantenere e sviluppare l'applicazione rispettando l'architettura consolidata, come documentato nel `registro.md`. Ogni modifica deve essere conforme al Modello Ibrido e alla struttura backend multi-codebase.

---

## 2. ZONA DI INTERVENTO CORRENTE: PAGINA PRESENZE

*   **STATO:** In Lavorazione. L'obiettivo è allineare la pagina `PresenzePage.tsx` all'architettura dati corretta e al Modello Ibrido.

---

## 3. ARCHITETTURA DATI: COLLEZIONI E MODELLI

### 3.1 Struttura Modello `Rapportino`

Questa sezione documenta la struttura del modello dati `Rapportino` come definito nell'interfaccia TypeScript (`src/models/definitions.ts`).

- **id**: string
- **clienteId**: string
- **completed**: boolean
- **createdAt**: Date
- **createdBy**: string
- **data**: Date
- **descrizioneBreve**: string
- **dettaglioOreTecnici**: array di oggetti
- **dittaId**: string
- **firmaFirmatarioNome**: string
- **firmaFirmatarioSocieta**: string
- **firmaVettoriale**: string
- **includeTrasferta**: boolean
- **isDeleted**: boolean
- **isLocked**: boolean
- **lavoroEseguito**: string
- **luogoId**: string
- **materialiImpiegati**: string
- **naveId**: string
- **nome**: string
- **ordineLavoro**: string
- **oreLavoro**: number
- **presenze**: array di stringhe
- **tecnicoId**: string
- **tecnicoScriventeId**: string
- **tipoGiornataId**: string
- **trasfertaId**: string
- **updatedAt**: Date
- **userId**: string
- **veicoloId**: string
- **version**: number

---

## 4. ARCHITETTURA TARGET: IL MODELLO IBRIDO

Il flusso di dati per **tutte** le operazioni deve seguire questo schema rigoroso:

*   **SINCRONIZZAZIONE INIZIALE (Login):**
    1.  Al login dell'utente, `useGlobalStore` avvia `runInitialSync()`.
    2.  `runInitialSync` scarica i dati da tutte le collezioni di Firestore.
    3.  Per i rapportini, i dati passano attraverso il processore `processRapportini` che converte i Timestamp e normalizza la struttura.
    4.  I dati puliti vengono salvati in blocco nel database locale Dexie (`db.bulkPut`).

*   **LETTURA (DB Locale -> UI):**
    1.  I componenti React leggono i dati **esclusivamente** da Dexie tramite hook come `useLiveQuery`. Questo garantisce una UI reattiva e performante che non dipende dalla latenza di rete.

*   **SCRITTURA (UI -> Backend -> DB Locale):**
    1.  Un'azione dell'utente in un componente scatena una chiamata a un servizio.
    2.  Il servizio invoca la Cloud Function appropriata.
    3.  **DOPO** aver ricevuto conferma dal backend, il servizio invoca `useGlobalStore.getState().syncCollectionByName('nome_collezione')`.
    4.  Questa azione pulisce la tabella locale corrispondente e riscarica i dati aggiornati da Firestore, chiudendo il cerchio e aggiornando la UI tramite il meccanismo di lettura reattiva.

---

## 5. STORICO INTERVENTI COMPLETATI

*   **Ristrutturazione Modello Dati `Rapportino`:** Risolta una grave discrepanza tra il modello dati dell'app e la struttura reale in Firestore.
*   **Creazione Tecnico:** Risolto un bug che impediva la creazione di nuovi tecnici a causa di un payload errato (`create` vs `add`).
*   **Gestione Accessi Tecnici (UI & Backend):** Risolto un bug di reattività della UI e chiusa una falla di sicurezza nel processo di disabilitazione utente.

## 6. NUOVI LAVORI

La logica di calcolo per straordinari, permessi, ferie e ROL è definita in modo definitivo e inderogabile nel file `buste.md`. Qualsiasi implementazione deve fare esclusivo riferimento a tale documento.

**Nota importante:** Lo sviluppo di questa sezione deve concentrarsi esclusivamente sulla gestione e visualizzazione delle **ore** e delle **assenze** (ferie, ROL, permessi). Tutti gli aspetti relativi alla **valorizzazione monetaria** (costi, calcolo della busta paga, ecc.) sono **esclusi** da questo task.

**Lavori da eseguire:**

Creare una pagina **ORE TECNICI** con le seguenti caratteristiche:
1.  **Visualizzazione Mensile:** Una sezione con la vista del mese corrente e pulsanti per navigare avanti e indietro tra i mesi.
2.  **Sezione Ore Lavorate:**
    *   Tabelle settimanali.
    *   In testata, in orizzontale: giorno della settimana e numero del giorno del mese.
    *   Sotto, righe distinte per le varie tipologie di ore (normale, straordinario diurno, ecc.).
3.  **Sezione Permessi/Ferie/ROL:**
    *   Tabella riepilogativa con i saldi: consumati, guadagnati, residui, totali.
    *   Un pulsante per aprire un modulo che permetta al tecnico di aggiungere o sottrarre ore/giorni di permesso/ferie/ROL, aggiornando il residuo.
4.  **Sezione Totali:** Subito dopo le tabelle orarie, una sezione che riepiloga i totali delle ore per ogni tipologia.
5.  **Stampa:** Possibilità di stampare le singole sezioni o una stampa multipla tramite generazione di un PDF. Il PDF in anteprima deve avere i pulsanti "Stampa" e "Condividi".
6.  **Fonte Dati:** La pagina deve leggere i dati dal database locale (Dexie), non direttamente da Firestore.
7.  **Stile:** Utilizzare uno schema di colori basato su sfondi neri e grigi, testo bianco e l'accento blu dell'app per testi evidenziati, cornici e linee.

---

## 7. SEZIONE ORE TECNICI

Questa sezione descrive lo stato attuale e il piano di correzione per la pagina `OreTecniciPage.tsx` e la logica di calcolo associata.

### 7.1 Lavori Eseguiti fino ad Ora
...

### 7.2 Cosa Non Va: Il Problema Fondamentale
...

### 7.3 Cosa Devo Fare: Il Piano di Correzione Definitivo
...

---

## 8. SEZIONE PRESENZE

Questa sezione descrive lo stato attuale e il piano di correzione per la pagina `PresenzePage.tsx`.

### 8.1 Cosa Non Va: Il Problema Fondamentale

Il problema critico e bloccante è che **la pagina `PresenzePage.tsx` non è allineata con l'architettura dati dell'applicazione (Modello Ibrido)**.

- **Fonte Dati Errata:** La pagina attualmente tenta di leggere i dati da una tabella del database locale (`checkins`) che non viene mai sincronizzata con i dati reali e aggiornati.
- **Origine dei Dati Reali:** I dati di presenza effettivi vengono inviati dai tecnici alla collezione `checkin_giornalieri` su Cloud Firestore.
- **Logica di Elaborazione Obsoleta:** La funzione `processaPresenze` e i componenti di visualizzazione sono stati scritti per interpretare una struttura dati vecchia e non sono in grado di processare la sequenza di eventi atomici (`inizio_giornata`, `check_in_luogo`, etc.) definita nelle specifiche correnti (`presenze_nuova.md`).
- **Risultato:** La pagina è inutilizzabile in quanto non mostra alcun dato corretto, ma solo una vista vuota o basata su dati obsoleti e non pertinenti.

### 8.2 Cosa Devo Fare: Il Piano di Correzione Definitivo

L'unica strada percorribile è un refactoring completo della logica di gestione dei dati della pagina, rispettando il Modello Ibrido.

1.  **Fase 1: Sincronizzazione dei Dati (`checkin_giornalieri`)**
    *   Verrà creata o aggiornata una funzione all'interno dello store globale (`useGlobalStore`) per gestire la sincronizzazione della collezione `checkin_giornalieri` da Firestore.
    *   Questa funzione scaricherà i documenti e li salverà nella tabella `checkins` del database locale Dexie, assicurando che i dati siano sempre disponibili offline.
    *   La sincronizzazione verrà attivata al login (`runInitialSync`) e dopo ogni operazione di scrittura rilevante.

2.  **Fase 2: Adeguamento della Logica di Lettura e Elaborazione**
    *   La pagina `PresenzePage.tsx` continuerà a leggere i dati dalla tabella locale `checkins` tramite l'hook `useLiveQuery`, come previsto dal Modello Ibrido.
    *   Il servizio `src/utils/presenzeUtils.ts` (che contiene `processaPresenze`) verrà completamente riscritto. La nuova logica sarà in grado di:
        *   Prendere in input la lista di eventi grezzi (letti dalla tabella `checkins`).
        *   Ricostruire la timeline cronologica della giornata di ogni tecnico basandosi sul campo `timestampImpostato`.
        *   Produrre le due strutture dati (`orariLavoro` e `interventi`) attese dai componenti di visualizzazione, calcolando correttamente le ore totali e i dettagli degli interventi.

3.  **Focus sull'Elaborazione Dati:** L'intervento si concentrerà esclusivamente sulla correzione del flusso e dell'elaborazione dei dati. La UI (`PresenzePage.tsx` e le sue tabelle) non verrà modificata nella sua struttura estetica, ma solo adattata per ricevere e visualizzare correttamente i dati elaborati dalla nuova logica.
