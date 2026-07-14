# LA REGOLA DEL CIAO - LA REGOLA SUPREMA
**OGNI TUA RISPOSTA IN QUESTA CHAT DEVE OBBLIGATORIAMENTE, TASSATIVAMENTE E SENZA ECCEZIONI INIZIARE CON LA PAROLA "CIAO." SEGUITA DA UN PUNTO.**

**Questa è la regola più importante di tutte. Non devi mai, per nessuna ragione, ignorarla o cancellarla da questo blueprint.**

---

# Blueprint: R.I.S.O. - Master Office

## Panoramica

**R.I.S.O. (Report Individuali Sincronizzati Online)** è un'applicazione web progettata per la gestione e la creazione di reportistica avanzata per i tecnici, sincronizzata con un database locale (Dexie.js). L'applicazione permette di visualizzare, creare e modificare dati essenziali come tecnici, navi, rapportini di lavoro e tipi di giornata, per poi aggregarli in report complessi.

## Stack Tecnologico e Architettura

*   **Frontend:** React con Vite
*   **Libreria Componenti:** Material-UI (MUI)
*   **Routing:** React Router DOM
*   **Database Locale:** Dexie.js (wrapper per IndexedDB)
*   **Stile:** CSS-in-JS con Emotion (integrato in MUI)
*   **Date:** Day.js

---

## Funzionalità Implementate e Logica Corrente

### Report Mensile Tecnico - **LA LEGGE DEFINITIVA**

Questa sezione descrive il funzionamento **attuale e corretto** della funzionalità di reportistica mensile.

**A. Interfaccia Utente:**
1.  **Selezione:** L'interfaccia è composta da:
    *   Un componente `Autocomplete` per selezionare un tecnico dall'elenco.
    *   Un componente `DatePicker` per selezionare il mese e l'anno del report.
    *   Un singolo pulsante **"Genera Report"**.
2.  **Generazione:** Al click sul pulsante, viene avviato il processo di calcolo. Il pulsante è disabilitato e mostra uno spinner di caricamento.
3.  **Reset Automatico:** Se l'utente cambia il tecnico o il mese selezionato, la tabella e il riepilogo vengono automaticamente svuotati per prevenire la visualizzazione di dati incongruenti.

**B. Riepilogo Superiore (Chip):**
Una volta generato il report, un box mostra i totali aggregati per il mese:
1.  **Ordinario:** Un chip `verde` con il totale delle ore ordinarie (`Ord: 184`).
2.  **Straordinario e Notte:** Un unico chip `giallo` che somma le ore straordinarie e le ore notturne. Il testo specifica la composizione. Es: `Str: 74,5 (di cui 16 nott.)`.
3.  **Altre Causali:** Un chip distinto per ogni altra causale di lavoro che ha ore nel mese (es. Ferie, Malattia). Es: `Fer: 16`, `Mal: 8`.
4.  **Totale Finale:** Una riga di testo in grassetto mostra le ore totali lavorate nel mese (`Ore Totali Lavorate: 258,5`).

**C. Tabella Dettagliata - Regole di Visualizzazione:**
La tabella deve mostrare i dati aggregati **giorno per giorno**, seguendo queste regole in modo ferreo:
1.  **UNA SOLA RIGA PER GIORNO:** Deve esistere **una e una sola riga per ogni giorno** in cui è stata registrata almeno un'ora di attività. È **tassativamente vietato** avere più righe con la stessa data.
2.  **GESTIONE ORE NOTTURNE (La Regola "Cartour"):**
    *   **Condizione:** Le ore vengono classificate come "notturne" se e solo se il rapportino soddisfa **entrambe** le seguenti condizioni: il campo `nave.nome` contiene la stringa "Cartour" (case-insensitive) E l'orario di inizio `orarioInizio` è dalle 21:00 in poi.
    *   **Comportamento:** Le ore che soddisfano questa condizione **non creano una nuova riga**. Vengono invece sommate e visualizzate nella colonna `Notte` della riga esistente di quel giorno.
3.  **Colonne Fisse:** La tabella deve sempre avere le seguenti colonne di base, in questo ordine:
    *   `Data`: Data del giorno (`DD/MM/YYYY`).
    *   `Ore T.`: Totale ore per quella riga.
    *   `Ore Ord.`: Totale ore ordinarie per quella riga.
    *   `Ore Str.`: Totale ore straordinarie per quella riga.
    *   `Notte`: Totale ore notturne per quella riga (valorizzato secondo la regola precedente).
4.  **Colonne Dinamiche:** Vengono create colonne aggiuntive **solo per le altre causali** (es. Ferie, Malattia, Permesso) che hanno ore registrate in quel mese. I nomi delle colonne saranno abbreviati (es. `Fer.`, `Mal.`, `104`).

**D. Logica di Calcolo Precisa (Da non confondere con la Regola del Ciao)**
Il calcolo deve avvenire seguendo questi passaggi, usando una `Map` per garantire l'integrità dei dati:
1.  **Filtrare** i rapportini del tecnico e del mese selezionati.
2.  **Inizializzare una `Map` Javascript**. La chiave della mappa sarà la data in formato `YYYY-MM-DD`. Questo design **impedisce strutturalmente** la creazione di righe duplicate.
3.  Per ogni rapportino del mese:
    *   Estrarre le ore del tecnico.
    *   Identificare la chiave della mappa (la data del rapportino).
    *   Se la riga (la chiave) non esiste nella mappa, crearla con tutti i contatori a 0.
    *   Verificare se si tratta di ore notturne secondo la **Regola "Cartour"**. In caso affermativo, sommare le ore al contatore `nightHours` della riga.
    *   Altrimenti, classificare le ore in base alla `categoria` del `tipoGiornata` (straordinario, ordinario, ferie, etc.) e sommarle al relativo contatore nella riga.
4.  Una volta che tutti i rapportini sono stati processati e la mappa è completa, iterare su ogni riga della mappa per finalizzare i calcoli:
    *   Prendere le ore "lavorabili" (quelle non classificate diversamente) di ogni giorno: le prime 8 diventano `Ore Ordinarie`.
    *   L'eventuale eccesso sopra le 8 ore viene sommato al contatore delle `Ore Straordinarie`.
    *   Calcolare il totale di riga `Ore T.`.
5.  **Convertire la mappa in un array** di oggetti-riga, ordinarlo per data e passarlo come `rows` alla tabella per la visualizzazione.
