# Dettagli Tecnici per l'Integrazione della Cloud Function `createRapportino`

Ciao,

ecco le informazioni precise che hai richiesto riguardo all'invio dei rapportini dalla nostra applicazione. Le ho raccolte analizzando il codice sorgente per garantire la massima accuratezza e risolvere il problema una volta per tutte.

### 1. URL Completo della Richiesta

L'URL a cui inviamo i dati del rapportino è:
`https://us-central1-riso-project-app.cloudfunctions.net/createRapportino`

### 2. Metodo HTTP Utilizzato

Utilizziamo il metodo **POST**.

### 3. Struttura Esatta del Corpo della Richiesta (JSON)

L'oggetto JSON che inviamo nel corpo della richiesta include tutti i campi del rapportino. Un esempio completo della sua struttura è il seguente:

```json
{
    "id": "3bb6ad66-a078-4cb0-b0f6-9d304e8c8183",
    "data": "2026-08-15T21:27:17.844Z",
    "tecnicoId": "IDAvSZayB1XBnF4E8CLHJAoYpqe2",
    "nome": "Rapportino-15/08/2026",
    "oreLavoro": 8,
    "tipoGiornataId": "lavoro_ordinario",
    "ordineLavoro": "ODL-12345",
    "isMultiDay": false,
    "dettaglioOre": [
        {
            "tecnicoId": "IDAvSZayB1XBnF4E8CLHJAoYpqe2",
            "nome": "Antonio Scuderi",
            "oraInizio": "08:30",
            "oraFine": "17:30",
            "pausa": "01:00",
            "ore": 8
        }
    ],
    "presenze": ["IDAvSZayB1XBnF4E8CLHJAoYpqe2"],
    "trasfertaId": "italia_nord",
    "veicoloId": "veicolo_01",
    "kmPercorsi": 150,
    "naveId": "nave_xyz",
    "luogoId": "cantiere_abc",
    "descrizioneBreve": "Manutenzione ordinaria",
    "lavoroEseguito": "Controlli eseguiti su motore principale, sostituito filtro olio.",
    "materialiImpiegati": "Filtro olio-A123, 5 litri olio 10W40.",
    "firmaVettoriale": "M10,90 C10,90...",
    "firmaFirmatarioNome": "Mario Rossi",
    "firmaFirmatarioSocieta": "Cliente SpA"
}
```

### 4. Header HTTP Inviati

Gli header che inviamo sono due e sono fondamentali:

1.  **`Content-Type`**: `application/json`
2.  **`Authorization`**: `Bearer [ID_TOKEN_UTENTE]`

L'header per l'autenticazione viene formattato esattamente come `Bearer ` (con lo spazio) seguito dall'ID token di Firebase dell'utente che sta effettuando la richiesta.

### 5. Descrizione dei Campi Inviati

Ecco la descrizione dei campi principali. Molti campi sono opzionali e potrebbero non essere presenti in ogni richiesta.

-   `id`: (Stringa) ID univoco del rapportino, generato dal client (formato UUIDv4).
-   `data`: (Stringa) La data principale del rapportino in formato stringa **ISO 8601 UTC** (es. `2026-08-15T21:27:17.844Z`).
-   `tecnicoId`: (Stringa) L'ID Firebase dell'utente (UID) che ha creato il rapportino.
-   `nome`: (Stringa) Un nome descrittivo per il rapportino, di solito generato automaticamente.
-   `oreLavoro`: (Numero) Un totale generico di ore di lavoro. Il dato più preciso è in `dettaglioOre`.
-   `tipoGiornataId`: (Stringa) L'ID del tipo di giornata selezionato (es. `lavoro_ordinario`, `ferie`, `malattia`).
-   `ordineLavoro`: (Stringa, opzionale) Il numero dell'ordine di lavoro associato.
-   `isMultiDay`: (Booleano) `true` se il rapportino copre un periodo di più giorni (es. ferie).
-   `dettaglioOre`: (Array di oggetti) Contiene i dettagli orari per ogni tecnico. Ogni oggetto ha:
    -   `tecnicoId`: (Stringa) ID del tecnico.
    -   `nome`: (Stringa) Nome del tecnico.
    -   `oraInizio`, `oraFine`, `pausa`: (Stringhe, formato `HH:mm`) Orari di lavoro e pausa.
    -   `ore`: (Numero) Ore totali calcolate per quel tecnico.
-   `presenze`: (Array di stringhe) Contiene gli ID di **tutti i tecnici** presenti, incluso il creatore.
-   `trasfertaId`: (Stringa, opzionale) L'ID del tipo di trasferta (es. `italia_nord`, `estero`).
-   `veicoloId`: (Stringa, opzionale) L'ID del veicolo utilizzato.
-   `kmPercorsi`: (Numero, opzionale) Chilometri percorsi.
-   `naveId`: (Stringa, opzionale) L'ID della nave/impianto.
-   `luogoId`: (Stringa, opzionale) L'ID del cantiere/luogo.
-   `descrizioneBreve`: (Stringa, opzionale) Un riassunto dell'intervento.
    `lavoroEseguito`: (Stringa, opzionale) Descrizione dettagliata dei lavori.
-   `materialiImpiegati`: (Stringa, opzionale) Elenco dei materiali.
-   `firmaVettoriale`: (Stringa, opzionale) La firma del cliente in formato vettoriale (es. SVG path data).
-   `firmaFirmatarioNome`: (Stringa, opzionale) Nome e cognome del firmatario.
-   `firmaFirmatarioSocieta`: (Stringa, opzionale) Società del firmatario.

---

### Esempio Concreto (dal log di errore)

Come da tua istruzione, aggiungo l'esempio del rapportino bloccato in coda, basato sui dati reali presenti nei log. L'operazione precedente è stata da te interrotta per permettere questa aggiunta.

Questo è l'esatto payload che sta causando l'errore `TypeError: Failed to fetch`:

```json
{
    "id": "3bb6ad66-a078-4cb0-b0f6-9d304e8c8183",
    "nome": "Rapportino-15/08/2026",
    "data": "2026-08-15T21:27:17.844Z",
    "oreLavoro": 8,
    "tecnicoId": "IDAvSZayB1XBnF4E8CLHJAoYpqe2",
    "ordineLavoro": "",
    "isMultiDay": false,
    "dettaglioOre": [],
    "presenze": [],
    "trasfertaId": "",
    "veicoloId": "",
    "kmPercorsi": 0,
    "naveId": "",
    "luogoId": "",
    "descrizioneBreve": "",
    "lavoroEseguito": "",
    "materialiImpiegati": "",
    "firmaVettoriale": null,
    "firmaFirmatarioNome": "",
    "firmaFirmatarioSocieta": ""
}
```

Spero che queste informazioni siano complete e sufficienti per allineare la Cloud Function. Grazie.
