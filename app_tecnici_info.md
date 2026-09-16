
# Analisi dell'App "Tecnici" per l'Integrazione con l'App "Master"

Questo documento descrive in dettaglio le strutture dati, le logiche di interazione e le interfacce (API) dell'applicazione "Tecnici". L'obiettivo è fornire all'applicazione "Master" tutte le informazioni necessarie per leggere, scrivere e gestire i dati generati dai tecnici.

## 1. Modello Dati su Firestore

L'applicazione utilizza Cloud Firestore come database principale. Le regole di sicurezza attuali (`firestore.rules`) sono permissive, consentendo lettura e scrittura a qualsiasi utente autenticato. La validazione dei dati è quindi delegata al codice dell'applicazione e alle Cloud Functions.

Di seguito sono elencate le collezioni principali e la struttura dei loro documenti.

### 1.1. Collezione `rapportini`

Contiene tutti i rapportini di lavoro creati dai tecnici.

**Struttura del Documento (esempio):**

```json
{
  "id": "<ID_AUTO_GENERATO>",
  "data": "2023-10-27",
  "presenze": ["<UID_TECNICO_1>", "<UID_TECNICO_2>"],
  "cliente": "<ID_CLIENTE>",
  "nave": "<ID_NAVE>",
  "localita": "<ID_LUOGO>",
  "lavoroEseguito": "Descrizione dettagliata del lavoro svolto.",
  "oreViaggio": {
    "type": "string", // Può essere 'forfait' o 'reali'
    "ida": "2.5",
    "ritorno": "2.5"
  },
  "dettagliOre": [
    {
      "tecnicoId": "<UID_TECNICO_1>",
      "tipoGiorno": "<ID_TIPO_GIORNATA>", // Es. Lavoro, Straordinario, Festivo
      "oreLavorate": "8"
    },
    {
      "tecnicoId": "<UID_TECNICO_2>",
      "tipoGiorno": "<ID_TIPO_GIORNATA>",
      "oreLavorate": "8"
    }
  ],
  "materiali": [], // Array di oggetti se necessario
  "richiesteCliente": "Eventuali richieste del cliente.",
  "veicolo": "<ID_VEICOLO>",
  "km": "120",
  "firmaCliente": "data:image/png;base64,...", // Immagine della firma in Base64
  "isDeleted": false,
  // Metadati gestiti dalle Cloud Functions
  "tecnicoScriventeId": "<UID_DEL_TECNICO_CHE_HA_CREATO_IL_DOC>",
  "createdBy": "<UID_TECNICO_CREATORE>",
  "updatedBy": "<UID_ULTIMO_TECNICO_MODIFICA>",
  "createdAt": "<TIMESTAMP>",
  "updatedAt": "<TIMESTAMP>"
}
```

**Note per l'App Master:**

*   **Lettura:** L'app Master può leggere l'intera collezione per avere una visione d'insieme. Può filtrare per `cliente`, `data`, `nave`, o analizzare le `presenze` per tecnico.
*   **Scrittura/Modifica:** La modifica diretta è sconsigliata. È preferibile utilizzare le Cloud Function fornite (vedi sezione 2) per garantire la coerenza dei metadati (`updatedBy`, `updatedAt`).
*   **Eliminazione:** I documenti non vengono mai eliminati fisicamente. L'app Tecnici imposta `isDeleted: true`. L'app Master deve fare lo stesso per "eliminare" un rapportino.

### 1.2. Collezione `checkin_giornalieri`

Registra l'inizio attività giornaliera dei tecnici.

**Struttura del Documento:**

```json
{
  "id": "<ID_AUTO_GENERATO>",
  "tecnicoId": "<UID_DEL_TECNICO>",
  "timestamp": "<TIMESTAMP_SCELTO_DA_UTENTE>",
  "tipo": "start", // O 'end' se si implementasse un check-out
  "posizione": {
    "latitude": 45.123,
    "longitude": 9.456
  },
  // Metadati gestiti dalle Cloud Functions
  "timestampReale": "<TIMESTAMP_DEL_SERVER>"
}
```

**Note per l'App Master:**

*   Questa collezione serve a monitorare la presenza e l'attività. L'app Master può leggerla per visualizzare chi è operativo e da dove ha iniziato.
*   La scrittura diretta da parte dell'app Master è improbabile, ma possibile se si dovesse registrare un check-in manualmente per conto di un tecnico.

### 1.3. Collezioni di Anagrafiche

Queste collezioni contengono dati di supporto che vengono sincronizzati sui dispositivi dei tecnici. L'app Master è la **principale responsabile** della loro gestione (creazione, modifica, eliminazione).

*   `clienti`: { id, nome, ... }
*   `navi`: { id, nome, id_cliente, ... }
*   `luoghi`: { id, nome, ... }
*   `ditte`: { id, nome, ... } // Azienda per cui lavora il tecnico
*   `categorie`: { id, nome, ... } // Categorie di lavoro
*   `tipiGiornata`: { id, nome, ... } // Es. Feriale, Festivo, Malattia
*   `veicoli`: { id, targa, modello, ... }
*   `tecnici`: { id, nome, cognome, uid, email, ... } // **Cruciale:** `id` qui potrebbe essere l'UID di Firebase.

**Note per l'App Master:**

*   **CRUD completo:** L'app Master deve avere un'interfaccia per gestire completamente queste anagrafiche. Ogni modifica sarà poi propagata ai tecnici tramite la funzione `syncAllAnagrafiche`.

### 1.4. Collezione per le Notifiche (es. `avvisi` o `notifiche`)

Questa collezione viene usata per mostrare una cronologia delle notifiche all'interno dell'app.

**Struttura del Documento:**

```json
{
  "id": "<ID_AUTO_GENERATO>",
  "userId": "<UID_DESTINATARIO>",
  "titolo": "Nuovo rapportino disponibile",
  "messaggio": "Il tecnico Mario Rossi ha creato un nuovo rapportino per il cliente X.",
  "tipo": "info", // O 'alert', 'warning'
  "letto": false,
  "timestamp": "<TIMESTAMP>",
  "link": "/rapportini/<ID_RAPPORTO>" // Link per navigare all'elemento correlato
}
```

**Note per l'App Master:**

*   L'app Master può **scrivere** in questa collezione per inviare messaggi o avvisi direttamente ai tecnici (visibili nella loro pagina Notifiche).
*   Questo **non invia una notifica PUSH**. È solo un messaggio nell'app.

## 2. Interfaccia API (Cloud Functions Chiamabili)

L'app Tecnici utilizza delle Cloud Functions di tipo `onCall` come API sicura per le operazioni di scrittura. L'app Master dovrebbe utilizzare queste stesse funzioni per manipolare i dati, garantendo che venga eseguita la stessa logica di validazione e di aggiornamento dei metadati.

**Regione:** Tutte le funzioni sono deployate in `europe-west6`.

*   `createRapportino(data)`
    *   **Input:** Oggetto `rapportinoData` (vedi struttura sopra), senza i metadati (`createdBy`, `createdAt`, etc.).
    *   **Azione:** Aggiunge i metadati (`tecnicoScriventeId`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `isDeleted: false`) e salva il nuovo documento. L'UID dell'utente che chiama la funzione viene usato per `tecnicoScriventeId`.
    *   **Output:** `{ id: "<ID_NUOVO_RAPPORTO>" }`

*   `updateRapportino(data)`
    *   **Input:** Oggetto `rapportinoData` che **deve includere l' `id`** del documento da modificare.
    *   **Azione:** Controlla che l'utente che chiama la funzione sia lo stesso che ha creato il rapportino. Aggiorna i campi e i metadati (`updatedBy`, `updatedAt`).
    *   **Output:** `{ id: "<ID_RAPPORTO_MODIFICATO>" }`

*   `deleteRapportino(data)`
    *   **Input:** `{ rapportinoId: "<ID_DEL_RAPPORTO>" }`
    *   **Azione:** Controlla i permessi e imposta `isDeleted: true`.
    *   **Output:** `{ id: "<ID_RAPPORTO_ELIMINATO>" }`

*   `createCheckin(data)`
    *   **Input:** Oggetto `checkinData` (vedi struttura sopra), senza `tecnicoId` e `timestampReale`.
    *   **Azione:** Aggiunge l'UID del chiamante come `tecnicoId` e il timestamp del server come `timestampReale`.
    *   **Output:** `{ id: "<ID_NUOVO_CHECKIN>" }`

*   `syncAllAnagrafiche(data)`
    *   **Input:** `{}` (oggetto vuoto).
    *   **Azione:** Legge tutte le collezioni di anagrafiche e le restituisce in un unico oggetto.
    *   **Output:** Un oggetto complesso con i dati di tutte le anagrafiche, es: `{ clienti: { data: [...] }, navi: { data: [...] }, ... }`

## 3. Logica di Notifica PUSH

L'invio di notifiche PUSH (quelle che appaiono sul dispositivo anche ad app chiusa) deve avvenire tramite un ambiente server, quindi **l'app Master è il candidato ideale per questo compito**.

**Flusso di lavoro raccomandato:**

1.  **Salvataggio del Token FCM:** L'app Tecnici, all'avvio e al login, ottiene un token FCM (Firebase Cloud Messaging) per il dispositivo. Questo token deve essere salvato da qualche parte, tipicamente in un documento associato all'utente (es. nella collezione `tecnici` o in una collezione `utenti` dedicata).

    ```json
    // Documento nella collezione `tecnici`
    {
      "nome": "Mario Rossi",
      "uid": "<UID_TECNICO_1>",
      "fcmTokens": ["<TOKEN_DISPOSITIVO_1>", "<TOKEN_DISPOSITIVO_2>"]
    }
    ```

2.  **Invio dalla Master App:** Quando l'app Master vuole inviare una notifica a un tecnico (o a tutti), deve:
    a.  Identificare gli UID dei destinatari.
    b.  Recuperare i loro `fcmTokens` da Firestore.
    c.  Utilizzare il **Firebase Admin SDK** (in un backend o una Cloud Function propria dell'app Master) per inviare il messaggio a quei token.

3.  **Trigger su Eventi:** L'app Master potrebbe avere delle Cloud Functions di tipo **Firestore Trigger**. Ad esempio, una funzione che si attiva quando un campo "urgente" viene impostato su `true` in un rapportino e invia una notifica PUSH al responsabile.

