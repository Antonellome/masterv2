# Blueprint Applicazione Master Office

## 1. Panoramica del Progetto

L'applicazione **Master Office** è un gestionale interno progettato per ottimizzare le operazioni quotidiane, con un focus sulla gestione dei tecnici, la rapportinazione e il monitoraggio delle presenze.

---

## 2. Funzionalità Implementate

### Componente `Presenze` (Dashboard Presenze)

Il componente `Presenze` è un cruscotto interattivo e autonomo per il monitoraggio in tempo reale dello stato dei tecnici in una data specifica.

#### 2.1. Architettura e Flusso Dati

*   **Componente Autonomo:** Per garantire massima stabilità e prevenire conflitti, il componente è stato isolato dal contesto globale dell'app (`useData`). Gestisce interamente il proprio stato e il caricamento dei dati.
*   **Caricamento Dati a Cascata (2 Fasi):**
    1.  **Caricamento Iniziale (Dati Statici):** All'avvio, il componente scarica da Firestore le collezioni `tecnici` and `tipiGiornata`. Un indicatore di caricamento centrale previene schermate vuote.
    2.  **Caricamento Dinamico (Dati Giornalieri):** Subito dopo la fase 1, e ad ogni cambio di data nel `DatePicker`, il componente esegue una query mirata sulla collezione `rapportini` per ottenere solo i documenti della giornata selezionata. Un indicatore di caricamento secondario appare solo durante questa breve operazione.

#### 2.2. Logica di Classificazione dei Tecnici

La classificazione avviene tramite una logica `useMemo` che si attiva solo quando tutti i dati sono pronti, basandosi sulle seguenti regole:

1.  **Definizione di Assenza:** Una lista statica `GIORNATE_ASSENZA_GIUSTIFICATA` (contenente `['ferie', 'malattia', 'permesso', 'legge 104', '104']`) definisce le giornate non operative.
2.  **Regole di Assegnazione:**
    *   **Operativo:** Un tecnico che ha compilato un rapportino in data odierna, il cui `tipoGiornata` **non** è nella lista delle assenze.
    *   **Assente Giustificato:** Un tecnico che ha compilato un rapportino, il cui `tipoGiornata` **è** nella lista delle assenze.
    *   **Mancante (Attivo):** Un tecnico con stato `attivo: true` che **non** ha compilato alcun rapportino per la data selezionata.
    *   **Assente (Non Attivo):** Un tecnico con stato `attivo: false` che non ha compilato rapportini.

#### 2.3. Interfaccia Utente (UI) e User Experience (UX)

*   **KPI Dashboard:** Quattro box principali mostrano il conteggio numerico in tempo reale per ciascuna categoria.
*   **Ricerca Intelligente:** Un campo di testo `TextField` permette di filtrare **in tempo reale** tutte e quattro le liste, cercando corrispondenze su nome e cognome.
*   **Liste a Dimensione Fissa:** Ogni lista di tecnici è contenuta in una `Paper` con altezza fissa (`height: 400px`) e scroll verticale (`overflowY: 'auto'`), garantendo un layout ordinato e scalabile anche con un numero elevato di tecnici.
*   **Ordinamento Alfabetico:** L'elenco principale dei tecnici viene ordinato alfabeticamente per **cognome** e, in caso di omonimia, per **nome**. Questo ordine si riflette in tutte le liste.
*   **Interattività:** Per i tecnici "Mancanti", è presente un pulsante "Crea R." che reindirizza al form di creazione rapportino, pre-compilando l'ID del tecnico e la data selezionata.

---

## 3. Piano di Sviluppo Attuale

*   **Stato:** Sviluppo del componente `Presenze` completato e validato.
*   **Prossimi Passi:** L'utente sposterà la cartella `master_app_source` contenente il codice e la documentazione nel workspace desiderato.
