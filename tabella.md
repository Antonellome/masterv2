# Analisi Dettagliata Tabella `RicercaAvanzata.tsx`

Questo documento scompone il funzionamento della tabella di ricerca avanzata, spiegando la provenienza, l'elaborazione e la visualizzazione dei dati per ogni colonna, come richiesto.

---

## 1. Sorgente dei Dati (Da dove legge)

La tabella attinge i dati da due fonti principali, entrambe provenienti dal database locale **Dexie.js**:

1.  **Rapportini:** Tutti i rapportini vengono caricati in memoria tramite la funzione `useLiveQuery(() => db.rapportini.toArray(), [])`. Questo significa che ogni modifica alla tabella `rapportini` nel database locale provoca un ricalcolo automatico.
2.  **Anagrafiche:** Tutte le tabelle di anagrafica (tecnici, navi, clienti, luoghi, tipi giornata) vengono caricate tramite un custom hook `useCollectionData<T>('nome_tabella')`. Anche queste sono "live", quindi i dati sono sempre aggiornati.

## 2. Elaborazione dei Dati (Come li recupera e trasforma)

Prima di essere mostrati, i dati grezzi subiscono una pesante trasformazione all'interno di un `useMemo`. Questo processo, chiamato `flatRapportini`, converte l'array di `rapportini` grezzi in un formato "piatto" e arricchito, più comodo per la visualizzazione e il filtraggio.

Ecco i passaggi chiave per ogni rapportino:

1.  **Creazione di Mappe (Look-up Tables):** Per efficienza, le anagrafiche vengono convertite in `Map` (es. `tecniciMap`, `naviMap`). Questo permette di trovare un nome a partire da un ID in modo istantaneo, senza dover ciclare l'intero array ogni volta.

2.  **Arricchimento del Rapportino:** Per ogni rapportino, vengono creati nuovi campi:
    *   `dataFormatted`: La data viene formattata in "DD/MM/YYYY".
    *   `clienteNome`: **Logica complessa.** Il nome del cliente viene recuperato cercando prima tramite la `naveId` del rapportino. Se la nave ha un `clienteId`, viene usato quello. Altrimenti, si cerca tramite il `luogoId`. Questo garantisce che un cliente venga sempre trovato se associato a una nave o a un luogo.
    *   `tecniciNomi` e `mainTecnicoNome`: Viene identificato il tecnico principale (`tecnicoId`). Poi, vengono raccolti TUTTI gli ID dei tecnici presenti, sia dal campo `presenze` (per i vecchi rapportini) sia dal campo `dettaglioOreTecnici` (per i nuovi). Gli ID vengono convertiti in nomi e cognomi.
    *   `tipoGiornataNome`, `naveNome`, `luogoNome`: Semplice "traduzione" degli ID in nomi leggibili usando le mappe create al punto 1.
    *   `oreResponsabile` e `oreTotali`: Vengono calcolate le ore. `oreTotali` è la somma di tutte le ore in `dettaglioOreTecnici`. `oreResponsabile` sono le ore specifiche del tecnico principale.

3.  **Filtraggio:** Dopo la trasformazione, un altro `useMemo` (`filteredRapportini`) applica i filtri selezionati dall'utente (range di date, tecnico specifico, cliente, etc.) all'array `flatRapportini` per produrre l'elenco finale da mostrare.

---

## 3. Scrittura in Tabella (Spiegazione di ogni colonna)

La `DataGrid` viene configurata con un array `columns`. Ecco il dettaglio per ogni colonna:

| Header | `field` | Sorgente del Dato | Logica di Visualizzazione (`renderCell`) |
| :--- | :--- | :--- | :--- |
| **Data** | `data` | `flatRapportino.dataFormatted` | Mostra la stringa di data già formattata. |
| **Tecnici** | `tecniciNomi` | `flatRapportino.mainTecnicoNome` + `flatRapportino.altriTecniciNomi` | **Visualizzazione custom:** Mostra il nome del tecnico principale in grassetto. Se ci sono altri tecnici, mostra un contatore `(+N)` accanto. Un `Tooltip` (finestra a comparsa) rivela la lista completa di tutti i tecnici se ci si passa sopra con il mouse. |
| **Tipo Giornata**| `tipoGiornataNome`| `flatRapportino.tipoGiornataNome`| Mostra il nome del tipo giornata (es. "Lavoro Ordinario"). |
| **Ordine Lavoro**| `ordineLavoro`| `flatRapportino.ordineLavoro`| Mostra il numero dell'ordine di lavoro, se presente. |
| **Nave** | `naveNome` | `flatRapportino.naveNome` | Mostra il nome della nave. |
| **Luogo** | `luogoNome` | `flatRapportino.luogoNome` | Mostra il nome del luogo. |
| **Cliente** | `clienteNome` | `flatRapportino.clienteNome` | Mostra il nome del cliente, recuperato con la logica descritta sopra. |
| **Ore Resp.**| `oreResponsabile`| `flatRapportino.oreResponsabile`| Mostra le ore del tecnico responsabile, formattate correttamente. |
| **Ore Totali**| `oreTotali`| `flatRapportino.oreTotali`| Mostra la somma totale delle ore lavorate da tutti i tecnici sul rapportino. |
| **Azioni** | `actions` | N/A (`type: 'actions'`) | **Colonna speciale:** Non mostra dati, ma una serie di pulsanti icona (`GridActionsCellItem`). Le azioni definite sono: **Modifica** (icona matita, porta alla pagina di modifica del rapportino), **Stampa** (icona stampante) e **Elimina** (icona cestino, che apre una finestra di dialogo per conferma). |
