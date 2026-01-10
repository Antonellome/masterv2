# Blueprint Progetto R.I.S.O. M.O. v3

Questo documento delinea l'architettura, le funzionalità e lo stato di avanzamento del progetto di gestione per R.I.S.O. Master Office

## 1. Overview Applicazione

L'applicazione è un gestionale web-based (PWA) progettato per l'ambiente Firebase Studio. Serve a digitalizzare e ottimizzare le operazioni di R.I.S.O. Master Office, una ditta di assistenza tecnica. Le funzionalità chiave includono la gestione dell'anagrafica dei tecnici, dei veicoli, delle scadenze amministrative e la sincronizzazione dei dati per l'accesso tramite un'app mobile.

## 2. Outline del Progetto e Funzionalità Implementate

Questa sezione documenta le decisioni architetturali, di design e le funzionalità implementate dall'inizio dello sviluppo fino alla versione corrente.

### Architettura e Stack Tecnologico
- **Frontend:** React con Vite.
- **Libreria Componenti:** Material-UI (MUI) per un design moderno e coerente.
- **Database:** Cloud Firestore per la persistenza dei dati.
- **Styling:** CSS-in-JS con le utility di MUI (`sx` prop).
- **Gestione Date:** `dayjs` per la manipolazione e formattazione delle date, in combinazione con i `Timestamp` nativi di Firestore.

### Standard di Esportazione PDF/Stampa

Per garantire un'immagine coordinata e professionale, tutte le funzioni di esportazione (in PDF o per la stampa diretta) devono seguire uno standard preciso.

- **Stile Generale:**
  - Tutte le esportazioni devono essere generate in **bianco e nero (testo nero su sfondo bianco)**, senza colori, per garantire massima leggibilità e risparmio di stampa.
  - **Intestazione:** In alto a sinistra, deve essere sempre presente il seguente logo testuale su due righe:
    - **R.I.S.O. Master Office**
    - Report Individuali Sincronizzati Online

- **Layout per Elemento Singolo (es. un solo tecnico):**
  - Il layout deve rispecchiare la struttura del **modulo di inserimento dati** dell'applicazione (es. `TecnicoForm`).
  - I campi devono essere raggruppati logicamente per sezioni (es. "Anagrafica", "Dati Lavorativi", "Documenti", "Formazione e Sicurezza"), proprio come nel form, per una facile consultazione.

- **Layout per Elenco di Elementi (es. lista tecnici):**
  - I dati devono essere presentati in un formato a **due colonne asimmetriche**.
  - **Colonna Sinistra (Fissa):** Contiene i campi identificativi principali (es. "Cognome" e "Nome").
  - **Colonna Destra (Fluida):** Contiene tutti gli altri dati, che vanno a capo se necessario senza invadere lo spazio sotto la colonna sinistra.
  - **Separatore:** Ogni elemento dell'elenco deve essere **separato dal successivo da una linea orizzontale netta** per distinguere chiaramente i record.

### Funzionalità Core Implementate

1.  **Gestione Anagrafica Tecnici:**
    - **CRUD Completo:** Sistema completo per la Creazione, Lettura, Aggiornamento ed Eliminazione (CRUD) dei tecnici.
    - **Lista Tecnici (`TecniciList.tsx`):** Tabella avanzata (`DataGrid` di MUI) con filtro, ricerca, e personalizzazione colonne. La tabella non eccede mai la larghezza dello schermo.
    - **Modulo di Inserimento/Modifica (`TecnicoForm.tsx`):** Dialog modale con campi raggruppati per sezioni e una tendina per il tipo di contratto.

2.  **Sincronizzazione Dati in Tempo Reale:**
    - **Hook `useData.ts`:** Utilizza `onSnapshot` di Firestore per l'aggiornamento istantaneo dell'interfaccia utente.

3.  **Gestione Scadenze:**
    - **Pagina Scadenze (`ScadenzePage.tsx`):** Dashboard per le scadenze imminenti e passate.
    - **Logica di Calcolo (`scadenze.ts`):** Utility per aggregare e calcolare lo stato delle scadenze.

### Correzioni Strutturali e Debug (Cronistoria)
- **Standardizzazione del Formato Data:** Uniformato l'uso di `Timestamp` di Firestore per il salvataggio delle date.
- **Correzione del Modulo (`TecnicoForm.tsx`):** Corretta la conversione bi-direzionale tra `Timestamp` e `dayjs`.
- **Correzione Visualizzazione Date (`TecniciList.tsx`):** Resa la tabella capace di leggere e formattare sia i `Timestamp` che le vecchie stringhe di testo.

---
### Indagine su Errore di Layout in `ReportMensili.tsx`

Questa sezione documenta un grave problema di layout riscontrato nel componente `ReportMensili.tsx` e la serie di tentativi di risoluzione che si sono rivelati infruttuosi.

#### Problema Iniziale
L'applicazione presentava due problemi concomitanti:
1.  **Errore di Compilazione:** Il processo di build falliva a causa di un errore di sintassi (`Expected corresponding JSX closing tag for <TableBody>`) in un file obsoleto e non più utilizzato, `src/components/Reportistica/ConsuntiviMensili.tsx`.
2.  **Errore di Layout (MUI DataGrid):** Una volta aggirato l'errore di compilazione, la griglia dati nel componente `ReportMensili.tsx` non veniva visualizzata, e la console mostrava l'errore: `MUI X: useResizeContainer - The parent DOM element of the Data Grid has an empty height`. Questo indica che il contenitore della griglia ha un'altezza calcolata di 0 pixel, impedendo alla griglia di renderizzarsi.

#### Risoluzione Errore di Compilazione ("File Fantasma")
L'errore di compilazione era causato da un riferimento a un file eliminato, mantenuto nella cache profonda di Vite.
- **Indagine:** È stato verificato che nessun file del progetto (`ReportisticaPage.tsx`, `App.tsx`, e i componenti figli) importava il file corrotto.
- **Soluzione:** Il problema è stato risolto forzando la pulizia della cache di Vite tramite il comando `rm -rf node_modules/.vite` e riavviando il server di sviluppo.

#### Tentativi Falliti di Risoluzione del Problema di Layout
Una volta risolto l'errore di compilazione, è riemerso il problema principale del layout. Sono state tentate, senza successo, le seguenti strategie sul file `ReportMensili.tsx` e sul suo genitore `ReportisticaPage.tsx`:

1.  **Flexbox Standard (`flex-grow: 1`):** Tentativo di far espandere il contenitore della griglia per riempire lo spazio disponibile nel suo genitore flessibile. **Esito: Fallito.**
2.  **Altezza Percentuale (`height: '100%`):** Applicazione esplicita di un'altezza del 100% alla griglia e a tutta la catena di contenitori. **Esito: Fallito.**
3.  **Layout Assoluto in `ReportisticaPage`:** Modifica dei pannelli delle tab per usare `position: 'absolute'` e riempire il viewport. **Esito: Fallito.**
4.  **Prop `autoHeight`:** Utilizzo della prop nativa della `DataGrid`, `autoHeight`, progettata per adattare l'altezza della griglia al suo contenuto, bypassando la necessità di un genitore con altezza definita. **Esito: Incredibilmente Fallito.**
5.  **Altezza Fissa (`minHeight`):** Approccio "brutale" applicando un'altezza minima fissa (es. `minHeight: 650px`) direttamente alla `DataGrid`. **Esito: Fallito.**
6.  **Pattern Ibrido (Relativo + Assoluto):** Configurazione del contenitore diretto della griglia con `position: 'relative'` e `flex-grow: 1`, e della `DataGrid` stessa con `position: 'absolute', height: '100%', width: '100%'`. Questo pattern, solitamente molto robusto, non ha prodotto risultati. **Esito: Fallito.**

#### Diagnosi Finale e Azione Raccomandata
Tutti i tentativi di risolvere il problema tramite la modifica del codice dei componenti React sono falliti. Questo indica che il problema non risiede in una semplice errata configurazione degli stili, ma in un conflitto o in una regola CSS in un punto più alto della gerarchia del DOM che forza il contenitore della griglia ad avere un'altezza pari a zero in un modo che non può essere sovrascritto.

**Il problema non è risolvibile tramite ulteriori modifiche ai file di componenti.**

**Azione Raccomandata:** È necessario un **debug manuale tramite gli strumenti per sviluppatori del browser**:
1.  Aprire la pagina "Reportistica" nel browser.
2.  Usare lo strumento "Ispeziona Elemento" per selezionare il `<div>` della `DataGrid` (con classe `MuiDataGrid-root`).
3.  Risalire l'albero del DOM, analizzando un genitore alla volta.
4.  Per ogni elemento genitore, controllare il pannello "Stili Calcolati" (`Computed`) e trovare il primo elemento che ha un valore di `height` pari a `0px` o a un valore inaspettatamente basso.
5.  **Quell'elemento è la causa del problema.** Analizzare le sue regole CSS per capire quale stile sta causando il collasso verticale.

*Nota: Il codice del componente `ReportMensili.tsx` è stato ripristinato a una configurazione flexbox pulita e standard, che rappresenta il punto di partenza ideale per questa indagine manuale.*

## 3. Piano d'Azione Prossimi Passi

1.  **RISOLVERE IL BUG DI LAYOUT:** Eseguire il debug manuale come descritto nella sezione precedente. Questa è la massima priorità.
2.  **Implementare lo Standard di Esportazione:**
    - Creare una utility di esportazione riutilizzabile (`src/utils/exportUtils.ts`) che generi l'HTML secondo le specifiche definite nello standard (gestendo sia il caso singolo che l'elenco).
    - Aggiungere un'icona di esportazione nella riga di ogni tecnico nella tabella `TecniciList.tsx`.
    - Collegare l'icona alla nuova funzione di esportazione per generare il report individuale del tecnico.
3.  **Estendere lo Standard:** Applicare la stessa logica di esportazione alle altre sezioni dell'applicazione (es. Veicoli, Navi) per coerenza.
