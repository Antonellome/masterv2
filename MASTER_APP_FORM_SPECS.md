
# Specifiche Tecniche per la Creazione del Form Report - App Master

## 1. Obiettivo

Questo documento fornisce le specifiche complete e dettagliate per la ricostruzione del form di creazione/modifica dei report di lavoro all'interno dell'App Master. L'obiettivo è garantire una coerenza funzionale e visiva al 100% con il form presente nell'App Tecnici, e assicurare la piena compatibilità della struttura dati generata (`Rapportino`).

**Attenersi scrupolosamente a queste specifiche per evitare disallineamenti dei dati.**

---

## 2. Design e Layout Visivo

Il form deve essere presentato con un design pulito e moderno, seguendo i principi del Material Design. L'interfaccia è suddivisa in sezioni logiche, ciascuna contenuta all'interno di un componente "Card" o "Paper" con una leggera ombra per dare un senso di profondità.

### Struttura Principale:
- **Contenitore:** Il form risiede in una pagina con uno sfondo grigio chiaro (es. `#f5f5f5`).
- **Sezioni:** Il layout è verticale, con le seguenti sezioni ordinate dall'alto verso il basso. Ogni sezione ha un'intestazione chiara.

---

## 3. Specifiche Funzionali e dei Campi

### Sezione 1: Dati Principali
- **Intestazione:** "Dati Principali"
- **Campi:**
    1.  **Data Intervento:**
        - **Label:** "Data"
        - **Componente:** Un selettore di data (Date Picker).
        - **Valore di default:** Data corrente.
    2.  **Tecnico Principale:**
        - **Label:** "Tecnico"
        - **Componente:** Un campo di sola lettura o un dropdown pre-selezionato.
        - **Logica:** Mostra il nome e cognome del tecnico che sta compilando il report. L'ID di questo tecnico sarà il creatore del report.
    3.  **Tipo di Giornata:**
        - **Label:** "Tipo Giornata"
        - **Componente:** Un menu a tendina (Dropdown/Select).
        - **Dati:** La lista deve essere popolata dalla collezione `tipiGiornata` presente su Firestore. Ogni opzione mostrerà il campo `nome` del documento.

### Sezione 2: Orari e Presenze
- **Intestazione:** "Orari di Lavoro"

#### Logica di Calcolo Ore
- **Componente:** Uno switch o selettore a due posizioni.
- **Label:** "Metodo di Inserimento"
- **Opzioni:**
    1.  **Normale (Default):**
        - **Campi Visibili:**
            - `Ora Inizio`: Selettore di orario (Time Picker) con step di 30 minuti. Default: 07:30.
            - `Ora Fine`: Selettore di orario (Time Picker) con step di 30 minuti. Default: 16:00.
            - `Pausa (minuti)`: Selettore con opzioni fisse: 0, 30, 60. Default: 60.
        - **Visualizzazione Ore:** Un campo di testo non editabile mostra le ore totali calcolate come: `(Ora Fine - Ora Inizio) - Pausa`.
    2.  **Manuale:**
        - **Campi Visibili:**
            - `Ore Lavorate`: Un campo numerico (Number Input) che permette l'inserimento diretto delle ore con step di 0.5.
        - **Visualizzazione Straordinario:** Se le ore inserite superano 8, il testo visualizzato deve essere formattato come `"8h + Xh"`, dove `X` sono le ore eccedenti le 8. Il valore salvato rimane il totale.

#### Gestione Presenze (Tecnici Aggiuntivi)
- **Componente:** Un pulsante "Aggiungi Tecnico".
- **Logica:**
    - Cliccando il pulsante, si apre un menu a tendina per selezionare altri tecnici dall'anagrafica.
    - Una volta aggiunto, appare una nuova riga/scheda per il tecnico aggiunto.
    - **Ereditarietà:** Il tecnico aggiunto eredita inizialmente lo stesso metodo di inserimento orario (Normale/Manuale) e gli stessi orari del tecnico principale.
    - **Modificabilità:** Tutti i campi orario per il tecnico aggiunto rimangono **indipendentemente modificabili**. Se il tecnico principale cambia il suo metodo da "Normale" a "Manuale", questo **non** deve alterare la selezione del tecnico già aggiunto.

### Sezione 3: Dettagli Intervento
- **Intestazione:** "Dettagli Intervento"
- **Campi:**
    1.  **Sede di Lavoro:**
        - **Componente:** Due menu a tendina separati.
        - **Label 1:** "Nave" (popolato dalla collezione `navi`).
        - **Label 2:** "Luogo" (popolato dalla collezione `luoghi`).
        - **Logica:** L'utente può selezionare o una Nave o un Luogo. La selezione di uno disabilita o pulisce l'altro.
    2.  **Veicolo Utilizzato:**
        - **Label:** "Veicolo"
        - **Componente:** Un menu a tendina (popolato da un'anagrafica veicoli). Opzionale.
    3.  **Descrizione Lavoro:**
        - **Label:** "Breve Descrizione Lavoro Eseguito"
        - **Componente:** Un campo di testo multi-linea (Text Area).
    4.  **Materiali Utilizzati:**
        - **Label:** "Materiali Utilizzati"
        - **Componente:** Un campo di testo multi-linea.

### Sezione 4: Chiusura e Firma Cliente
- **Intestazione:** "Validazione Cliente"
- **Campi:**
    1.  **Nome Firmatario:**
        - **Label:** "Nome e Cognome del Firmatario"
        - **Componente:** Campo di testo standard.
    2.  **Società:**
        - **Label:** "Società"
        - **Componente:** Campo di testo standard.
    3.  **Area Firma:**
        - **Componente:** Un'area canvas (Signature Pad) che permette al cliente di apporre la propria firma digitale. Devono essere presenti i pulsanti "Pulisci" per cancellare e ricominciare.

### Sezione 5: Azioni
- **Componenti:** Due pulsanti principali, ben visibili in fondo alla pagina.
    1.  **Pulsante "Salva Report"**:
        - **Stile:** Pulsante primario (es. sfondo blu, testo bianco).
        - **Logica:** Innesca la validazione del form e il processo di salvataggio.
    2.  **Pulsante "Condividi"**:
        - **Stile:** Pulsante secondario (es. stile "outlined").
        - **Logica:** (Funzionalità avanzata) Permette di generare un riepilogo (es. PDF o testo) da condividere tramite app esterne.

---

## 4. Contratto Dati: Struttura Oggetto Finale

Al momento del salvataggio, il form deve costruire e inviare a Firestore un oggetto JSON con la seguente struttura **esatta**. I nomi dei campi sono **critici** per la compatibilità.

```json
{
  // --- RIFERIMENTI OBBLIGATORI ---
  "data": "Timestamp", // Data dell'intervento (Timestamp di Firestore)
  "tipoGiornataId": "string", // ID del documento selezionato da 'tipiGiornata'
  "isTrasferta": "boolean", // Questo campo dovrà essere aggiunto alla logica
  
  // Riferimento alla sede di lavoro
  "sede": {
    "tipo": "'nave' | 'luogo'", // Stringa che indica la collezione di provenienza
    "id": "string" // ID del documento 'nave' o 'luogo' selezionato
  },

  // --- DETTAGLI DEL LAVORO ---
  "presenze": [
    "string" // Array di ID (UID) di tutti i tecnici presenti, incluso il principale
  ],
  "dettaglioOreTecnici": [
    {
      "tecnicoId": "string", // ID del tecnico
      "ore": "number" // Totale ore lavorate da quel tecnico
    }
  ],
  
  "descrizioneBreve": "string", // Dal campo "Breve Descrizione Lavoro Eseguito"
  "lavoroEseguito": "string", // Da un campo dedicato se presente, altrimenti usare descrizioneBreve
  "materialeUtilizzato": "string", // Dal campo "Materiali Utilizzati"

  // --- FIRMA E CHIUSURA ---
  "firma": {
    "nomeFirmatario": "string", // Dal campo "Nome e Cognome del Firmatario"
    "societa": "string", // Dal campo "Società"
    // L'immagine della firma deve essere caricata su Firebase Storage.
    // Qui va salvato solo il percorso (path) del file su Storage.
    "signatureStoragePath": "string" 
  },

  // --- METADATI DI SISTEMA (Gestiti automaticamente) ---
  "metadata": {
    "createdAt": "Timestamp", // Timestamp del momento della creazione del documento
    "createdBy": "string", // UID del tecnico che ha creato il report
    "updatedAt": "Timestamp", // Opzionale, solo in caso di modifica
    "updatedBy": "string" // Opzionale, UID di chi ha modificato
  }
}
```
