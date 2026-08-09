# Logica di Condivisione dei Rapportini tramite Cloud Function

## Problema

Quando un tecnico (autore) crea un rapportino e aggiunge altri tecnici nel campo `presenze`, quel rapportino deve apparire automaticamente anche sulle app degli altri tecnici inclusi. Le app individuali non sanno di dover scaricare un rapportino in cui sono presenti ma non sono l'autore principale, rendendo le query lato client complesse e inefficienti.

## Soluzione: Denormalizzazione tramite Cloud Function

La soluzione è demandare a un'infrastruttura "master" (una Cloud Function su Firebase) il compito di preparare i dati per ottimizzare la lettura da parte delle app client. Questo processo è noto come **denormalizzazione**.

### 1. Trigger della Cloud Function

La funzione deve attivarsi **automaticamente ogni volta che un nuovo documento viene creato** nella collezione `rapportini` su Firestore.
- **Servizio:** Cloud Functions for Firebase
- **Trigger:** `onCreate`
- **Collezione:** `rapportini`

### 2. Logica Fondamentale della Funzione

Quando la funzione si attiva con un nuovo rapportino, deve eseguire i seguenti passaggi:

1.  **Leggere il Nuovo Rapportino:** La funzione riceve come input il documento appena creato.

2.  **Estrarre gli ID dei Partecipanti:** La funzione deve raccogliere tutti gli ID dei tecnici coinvolti:
    *   L'ID del tecnico che ha creato il report (dal campo `tecnicoId`).
    *   Tutti gli ID dei tecnici aggiunti come presenti (dall'array `presenze`).

3.  **Creare un Nuovo Campo:** La funzione deve aggiungere un nuovo campo al documento stesso. Il nome consigliato per questo campo è **`partecipanti`**.

4.  **Popolare il Nuovo Campo:** Il campo `partecipanti` deve essere un **ARRAY** di stringhe (gli ID dei tecnici). Questo array deve contenere la lista unificata e senza duplicati di tutti gli ID raccolti al punto 2.

5.  **Aggiornare il Documento:** La funzione salva la modifica, aggiornando il documento del rapportino su Firestore con il nuovo campo `partecipanti`.

### Esempio Pratico

- **Scenario:** Il Tecnico A (ID: `tech_A`) crea un rapportino e aggiunge come presenti i tecnici B (ID: `tech_B`) and C (ID: `tech_C`).

- **Documento Iniziale su Firestore (al momento della creazione):**
  ```json
  {
    "tecnicoId": "tech_A",
    "presenze": ["tech_B", "tech_C"],
    "data": "...",
    "oreGiorno": 8
  }
  ```

- **Azione della Cloud Function:**
  1. La funzione si attiva.
  2. Legge il documento.
  3. Crea l'array `partecipanti` unendo `tecnicoId` e `presenze`: `["tech_A", "tech_B", "tech_C"]`.

- **Documento Finale su Firestore (dopo l'esecuzione della funzione):**
  ```json
  {
    "tecnicoId": "tech_A",
    "presenze": ["tech_B", "tech_C"],
    "data": "...",
    "oreGiorno": 8,
    "partecipanti": ["tech_A", "tech_B", "tech_C"]
  }
  ```

### 3. Vantaggio per le App Client

Con questa struttura dati denormalizzata, la logica di sincronizzazione sulle app dei tecnici diventa estremamente semplice ed efficiente.

Ad ogni tecnico basterà eseguire **una sola, semplice query** per scaricare tutti i rapportini che lo riguardano, sia quelli creati da lui che quelli in cui è stato aggiunto da altri:

```javascript
// Esempio di query Firestore per l'app client
const mioIdTecnico = "tech_B"; // ID del tecnico loggato nell'app
const queryRapportini = db.collection("rapportini")
                         .where("partecipanti", "array-contains", mioIdTecnico);
```

Questa singola query restituisce tutti i documenti in cui l'ID del tecnico compare nell'array `partecipanti`, risolvendo il problema di sincronizzazione alla radice in modo pulito, efficiente e scalabile, secondo le best practice di Firestore.
