# Specifiche Tecniche Complete: Gestione Report di Intervento

**Versione:** 2.0 (Definitiva e Corretta)
**Oggetto:** Questo documento funge da guida tecnica completa e definitiva per la replica, la gestione e la visualizzazione dei report di intervento. È rivolto allo sviluppatore dell'App Master e si basa sull'analisi diretta del codice sorgente dell'App Tecnici per garantire una corrispondenza 1:1. **Tutte le documentazioni precedenti sono da considerarsi obsolete e non valide.**

---

## Sezione 1: Il Form di Creazione e Modifica Report

(Contenuto verificato e corretto)

### 1.1. Layout Generale e Intestazione

Il form è contenuto in un `Paper` con elevazione `3` e padding. L'intestazione è fissa e non modificabile:

*   **Titolo Principale:** "Tecnologie Industriali Navali" (Variante `h4`, Grassetto)
*   **Sottotitolo:** "Report Intervento" (Variante `h6`)
*   **Separatore:** Linea orizzontale (`2px solid`) sotto l'intestazione, colore `primary.main`.

### 1.2. Sezione "Dati Principali"

| Componente UI | Label | Campo Dati Correlato | Logica e Comportamento |
| :--- | :--- | :--- | :--- |
| **Switch** | "Crea per più giorni (solo Ferie/Malattia)" | `isMultiDay` (boolean) | **Visibilità:** Solo in creazione. Se `true`, permette la selezione di un intervallo di date e filtra "Tipo Giornata" per mostrare solo opzioni con keyword "ferie" o "malattia". |
| **DatePicker** | "Data" / "Dal" | `data` (Date) | Campo obbligatorio. |
| **DatePicker** | "Al" | `dataFine` (Date) | **Visibilità:** Solo se `isMultiDay` è `true`. |
| **TextField** (Disabilitato) | "Tecnico Responsabile" | `tecnicoScriventeId` | Mostra il nome dell'utente che compila. Non modificabile. |
| **TextField** | "Ordine di Lavoro" | `ordineLavoro` (string) | Libero. |
| **Select** (Obbligatorio) | "Tipo Giornata" | `tipoGiornataId` (string) | Menù a tendina. **Logica cruciale:** La selezione determina se la giornata è "lavorativa" o di "assenza" (es. Ferie), cambiando la visibilità delle sezioni successive. |
| **Switch** | "Aggiungi Trasferta" | `includeTrasferta` (boolean) | Se `true`, mostra il menù "Tipo di Trasferta". |
| **Select** (Obbligatorio) | "Tipo di Trasferta" | `trasfertaId` (string) | **Visibilità:** Solo se `includeTrasferta` è `true`. |

### 1.3. Sezione "Tecnici Coinvolti"

**Visibilità:** Visibile solo per tipi di giornata "lavorativi" e in modalità giorno singolo.

*   **Tecnico Scrivente:** Mostra il componente `OreLavoroSingoloTecnico` per la gestione orari.
*   **Aggiunta Altri Tecnici:** Un campo `Autocomplete` permette di aggiungere altri tecnici, clonando gli orari di default dello scrivente.
*   **Elenco Tecnici Aggiunti:** Lista i tecnici con pulsanti per modificare (`EditIcon`) o rimuovere (`DeleteIcon`) ciascuno.

### 1.4. Sezione "Dettagli Intervento"

**Visibilità:** Stesse condizioni della sezione "Tecnici Coinvolti".

| Componente UI | Label | Campo Dati Correlato | Obbligatorio? |
| :--- | :--- | :--- | :--- |
| **Select** | "Nave" | `naveId` (string) | **Sì** (se lavorativo e non eccezione) |
| **Select** | "Luogo" | `luogoId` (string) | **Sì** (se lavorativo e non eccezione) |
| **Select** | "Veicolo" | `veicoloId` (string) | No |
| **TextField** (Multiline) | "Lavoro Eseguito" | `lavoroEseguito` (string) | **Sì** (se lavorativo e non eccezione) |
| ... | (Altri campi come da analisi precedente) | ... | ... |

### 1.5. Sezione "Firma Cliente"

**Visibilità:** Stesse condizioni delle sezioni precedenti. La firma (`firmaVettoriale`) è una stringa SVG Base64 e non è più modificabile dopo il primo salvataggio.

---

## Sezione 2: Schema Dati e Logica di Business

(Contenuto verificato e corretto)

### 2.1. L'Interfaccia `Rapportino` e `DettaglioOreTecnico`

Lo schema dati è confermato come da analisi precedente. Ogni report deve aderire a questa struttura.

### 2.2. Chiarimenti sulla Logica Critica

**1. Ore di Default e Tipi di Orario (`isManual`)**

*   La gestione delle ore dipende dal flag `isManual` nell'oggetto `DettaglioOreTecnico`.
*   **Se il tipo di giornata è "Lavorativo"**: `isManual` è **`false`**. L'utente inserisce `oraInizio` (default `07:30`) e `oraFine` (default `16:30`). Il campo `ore` viene **calcolato** sottraendo la `pausa` (default `60` min). **Valore di default calcolato: 8 ore.**
*   **Se il tipo di giornata è "Assenza" (Ferie, Malattia)**: `isManual` è **`true`**. L'utente inserisce direttamente un numero nel campo `ore`. **Valore di default diretto: 8 ore.**
*   **Azione per l'App Master:** Replicare questa logica. Per giorni lavorativi, calcolare le ore basandosi su inizio, fine e pausa. Per le assenze, usare il valore `ore` direttamente.

**2. Distinzione tra "Tipi di Giornata" e "Trasferte"**

*   Entrambi i tipi di dato sono memorizzati nella stessa collection `tipiGiornata` di Firestore, ma vengono filtrati e presentati in due menù a tendina separati.
*   **Logica di Filtro:** Un record è considerato una **"Trasferta"** se il suo documento ha un campo `categoria` uguale a `'trasferta'` OPPURE se il suo campo `nome` contiene la parola `'trasferta'` (case-insensitive).
*   **"Tipi di Giornata"**: Sono tutti i record della collection `tipiGiornata` che **NON** soddisfano la condizione di cui sopra.
*   **Azione per l'App Master:** Applicare la stessa identica logica di filtro per popolare i due menù a tendina e garantire che l'utente possa selezionare i valori corretti per `tipoGiornataId` e `trasfertaId`.

### 2.3. Validazione e Costruzione del Dato

La logica di validazione e costruzione del dato è confermata come da analisi precedente. I campi obbligatori condizionali e la derivazione di `clienteId` e `dittaId` sono i punti più importanti da replicare.

---

## Sezione 3: Specifiche di Generazione PDF (`rapportinoPDFGenerator.ts`)

Questa sezione descrive la generazione del PDF per garantire una stampa 1:1.

### 3.1. Impostazioni Generali

*   **Libreria:** `jsPDF` (`2.5.1`) con `jspdf-autotable` (`3.5.23`).
*   **Formato:** A4 Potrait (`210x297mm`).
*   **Margini:** `15mm` su tutti i lati.
*   **Colori Principali:**
    *   Blu Primario: `#0D47A1` (per titoli e linee)
    *   Grigio Scuro: `#424242` (per header tabelle e label)
    *   Nero: `#000000` (per il testo del corpo)

### 3.2. Struttura del Documento

1.  **Intestazione Aziendale:**
    *   Testo: `Tecnologie Industriali Navali S.R.L.` (Font: Helvetica Bold, Size: 20, Colore: Blu Primario, Allineamento: Centro).
    *   Info Azienda (indirizzo, contatti, P.IVA): Blocco di 4 righe (Font: Helvetica Normal, Size: 9, Colore: Nero, Allineamento: Centro).

2.  **Titolo Report:**
    *   Una linea separatrice blu (spessore `0.5mm`).
    *   Testo: `REPORT DI INTERVENTO TECNICO` (Font: Helvetica Bold, Size: 16, Colore: Blu Primario, Allineamento: Centro).

3.  **Dati Principali (Layout a 2 Colonne):**
    *   Le label (es. "Data:", "Nave:") sono in **grassetto**, i valori in **normale** (Font: Helvetica, Size: 10, Colore: Nero).
    *   Le anagrafiche (Nave, Luogo, Veicolo) vengono risolte dagli ID ai loro nomi corrispondenti.

4.  **Tabella Tecnici Intervenuti:**
    *   Generata con `autoTable`.
    *   **Header:** Altezza fissa, sfondo Grigio Scuro (`#424242`), testo bianco. Colonne: "Tecnici Intervenuti", "Orari", "Ore".
    *   **Corpo:** Tema `grid` (con tutte le linee visibili).
    *   **Totale Ore:** Sotto la tabella, a destra, viene mostrato il testo `Totale ore tecnici: XX.XX` (Font: Helvetica Bold, Size: 8, Colore: Grigio Scuro).

5.  **Dettagli Lavoro (Layout a Blocchi):**
    *   Per "Breve Descrizione Lavoro", "Materiali Impiegati" e "Lavoro Eseguito".
    *   Ogni blocco ha una **label** in grassetto (Size: 11, Colore: Grigio Scuro) seguita dal contenuto testuale (Size: 10, Colore: Nero) che va a capo automaticamente.

6.  **Sezione Firma (in fondo alla pagina):**
    *   Ancorata a `75mm` dal fondo della pagina, con una linea separatrice blu.
    *   Layout a 2 colonne: "Per accettazione" a sinistra, "Firma Tecnico" a destra.
    *   I nomi del firmatario e del tecnico vengono stampati.
    *   **Logica Firma Cruciale (`processSignatureForPdf`):**
        *   La firma salvata (`firmaVettoriale`) è un'immagine SVG con tratto **bianco** su sfondo trasparente.
        *   Prima di essere inserita nel PDF, viene processata su una `<canvas>` HTML:
            1.  Il tratto viene **ricolorato di nero**.
            2.  Il tratto viene **ispessito artificialmente** disegnando l'immagine più volte con un offset di `0.5px`.
            3.  Viene aggiunto uno **sfondo bianco opaco**.
            4.  L'immagine risultante viene convertita in formato **PNG** e inserita nel PDF.
        *   **Azione per l'App Master:** È OBBLIGATORIO replicare questo processo di elaborazione dell'immagine per rendere la firma visibile e stampabile correttamente.

--------------------------------------------------------------------------------------------------------------
attenzione regole ulteriori

il tecnico scrivente deve essere scelto da tendina tra i tecnici
il report non ha limiti di modifica tranne nella firma che una volta esistente non si modifica se salvata
