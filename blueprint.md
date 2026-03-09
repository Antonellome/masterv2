# REGOLE OPERATIVE FONDAMENTALI (NON RIMUOVERE, NON MODIFICARE)

---

## 1. Regola della "Simulazione Virtuale"

Questa regola definisce il protocollo di analisi e azione prima di ogni modifica.

*   **Simulazione Virtuale:** Devo simulare mentalmente l'impatto della modifica sull'intera applicazione.
*   **Anticipazione dello Scacco (Pre-Fix):** Devo identificare in anticipo tutti i possibili errori che la modifica potrebbe generare, con particolare attenzione ai breaking changes delle librerie.
*   **Contromossa Preventiva:** Devo progettare la soluzione includendo già le sicurezze e le configurazioni per evitare gli errori previsti.
*   **Base di Conoscenza Permanente (`blueprint.md`):** Ogni nuova regola di migrazione, breaking change o soluzione architetturale deve essere immediatamente e indelebilmente documentata nel `blueprint.md` per evitare fallimenti futuri.

## 2. Regola del "CIAO"

Questa regola definisce il protocollo di comunicazione. Ogni mia singola risposta deve tassativamente iniziare con la parola "CIAO". Funziona come un "checksum" per assicurare che io mantenga sempre il contesto della nostra conversazione.

---

# Blueprint: R.I.SO. Management App

_... (sezioni precedenti invariate) ..._

---

## Piano di Intervento: Normalizzazione del Dato "Categoria" (28/05/2024)

### Il Problema: Incoerenza Fatale dei Dati tra Frontend e Backend

*   **Causa:** Le notifiche per categoria non funzionano a causa di una discrepanza nel formato del dato `categoria` associato a un tecnico.
    *   **Frontend (`TecnicoForm.tsx`):** Salvava il dato come un **oggetto complesso** (es: `{ id: "cat1", nome: "Elettricista" }`).
    *   **Backend (Cloud Function):** Si aspettava di ricevere un **ID stringa** in un campo `categoriaId` (es: `"cat1"`).
*   **Conseguenza:** Le query del backend per trovare i tecnici di una data categoria fallivano, non restituendo alcun risultato e impedendo l'invio delle notifiche.

### La Strategia Risolutiva: Normalizzazione all'Ingresso

Per risolvere il problema alla radice e garantire la coerenza perpetua del dato, si procederà con la **normalizzazione del dato direttamente all'ingresso**, ovvero all'interno del form di modifica.

### L'Intervento: Cosa, Perché, Come

*   **COSA:** Verrà modificato il file `src/components/Tecnici/TecnicoForm.tsx`.
*   **PERCHÉ:** Per standardizzare il formato del dato `categoria` prima che venga salvato, assicurando che sia sempre e solo un ID stringa (`categoriaId`). Questo risolve il bug delle notifiche e previene future corruzioni del dato.
*   **COME:**
    1.  **Azione:** Verrà potenziato il `useEffect` che inizializza il form all'apertura.
    2.  **Logica di "Pulizia":** All'interno del `useEffect`, verrà aggiunta una logica che controlla i dati del tecnico in ingresso:
        *   Se rileva la presenza di un campo `categoria` strutturato come un oggetto (dato "legacy"), estrae il suo `id`.
        *   Assegna questo `id` al campo corretto: `categoriaId`.
        *   **Rimuove** la vecchia e problematica proprietà `categoria` dall'oggetto dati.
    3.  **Risultato:** Il form opererà sempre con una struttura dati pulita e coerente. La funzione di salvataggio (`handleSave`) invierà al backend solo il campo `categoriaId`, allineando perfettamente frontend e backend.


## Standard di Sintassi Obbligatorio (Decisione del 25/05/2024 - **Versione Definitiva Post-Analisi**)

### 1. Fonte della Verità: Analisi Comparativa

*   **Metodo:** A seguito di ripetuti fallimenti nell'applicare una sintassi standard "da manuale", si è proceduto con l'analisi comparativa del codice sorgente di componenti funzionanti (`ReportMensili.tsx`) contro quello non funzionante (`RicercaAvanzata.tsx`).
*   **File Analizzato:** `src/components/Reportistica/ReportMensili.tsx`.
*   **Obiettivo:** Identificare la reale sintassi del componente `Grid` utilizzata e funzionante nel progetto, ignorando le ipotesi precedenti.

### 2. Lo Standard di Sintassi Ufficiale e Definitivo per `Grid`

*   **Scoperta:** L'analisi ha rivelato l'uso di una sintassi "ibrida" per il componente `Grid` di Material-UI, che rappresenta lo standard de-facto per questo progetto.
*   **Importazione Corretta:** Il componente `Grid` deve essere importato dalla libreria stabile:
    ```javascript
    import { Grid } from '@mui/material';
    ```
*   **Sintassi Obbligatoria del Contenitore:** Il componente che funge da contenitore **DEVE** utilizzare la prop `container`, tipica della v1:
    ```jsx
    <Grid container spacing={2}>
    ```
*   **Sintassi Obbligatoria degli Elementi Figli:** I componenti che fungono da elementi figli (item) **DEVONO** utilizzare la prop `size` con un oggetto per i breakpoint, una sintassi tipica della v2, ma **SENZA** la prop `item`:
    ```jsx
    <Grid size={{ xs: 12, sm: 6, md: 4}}>
    ```
*   **Conclusione Finale:** Questo modello ibrido è la regola. Qualsiasi deviazione da questo standard ha generato errori e deve essere evitata. Questa regola sostituisce tutte le precedenti analisi e ipotesi errate.

### 3. Bonifica dei Form (`FormDialog.tsx`) e Propagazione di Props

*   **Problema:** I layout dei form di anagrafica (es. Clienti, Navi) erano rotti, con i campi impilati verticalmente invece di affiancarsi secondo le regole della griglia.
*   **Causa:** Il componente riutilizzabile `src/components/Anagrafiche/FormDialog.tsx` utilizzava una sintassi errata per applicare le proprietà della griglia ai suoi figli. Usava `<Grid size={field.gridProps}>` che è invalido.
*   **Soluzione Standard Corretta:** La sintassi corretta per passare un oggetto di props (come `xs`, `sm`, etc.) a un componente `Grid` è utilizzare l'operatore di spread (`...`).
    ```jsx
    // Errato
    <Grid size={field.gridProps}> 

    // Corretto e da applicare ovunque
    <Grid {...field.gridProps}> 
    ```
*   **Azione Eseguita:** Il file `FormDialog.tsx` è stato corretto utilizzando la sintassi `...field.gridProps`.
*   **Stato:** **Successo.** La modifica ha risolto il problema di layout in tutti i form che dipendono da `FormDialog`, come confermato. Questa soluzione è ora lo standard per la propagazione delle props di `Grid`.

### 4. Problema di Layout del `DataGrid` (`empty height`)

*   **Problema Rilevato:** Il componente `DataGrid` di MUI X non viene renderizzato se il suo contenitore non ha un'altezza esplicita.
*   **Soluzione Standard:** Il `DataGrid` deve essere inserito in un contenitore che fa parte di un layout **flexbox verticale**. Il contenitore genitore deve avere `display: 'flex'`, `flexDirection: 'column'` e un'altezza definita (es. `height: '100vh'`). Il contenitore diretto del `DataGrid` (solitamente un `Box` o `Paper`) deve avere la prop `sx={{ flexGrow: 1 }}` per occupare tutto lo spazio verticale disponibile.

---
