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

# R.I.S.O. - Blueprint di Progetto

Questo documento definisce i principi architetturali e le linee guida per lo sviluppo dell'applicazione R.I.S.O. (Report Individuali Sincronizzati Online). Aderire a queste regole è obbligatorio per garantire manutenibilità, coerenza e scalabilità del codice.

## 1. Architettura Generale

L'applicazione segue un'architettura basata su componenti React, con un backend serverless fornito da Firebase (Firestore, Authentication). I principi chiave sono la separazione delle responsabilità e il flusso di dati unidirezionale.

### Principi Chiave

1.  **Separation of Concerns (SoC):** La logica di business, la manipolazione dei dati e la loro visualizzazione devono essere nettamente separate.
    *   **Data Fetching:** Centralizzato in custom hooks (es. `useCollection`) o in `useEffect` di alto livello.
    *   **Data Manipulation:** La logica di creazione, modifica e calcolo dei dati risiede nei componenti form (es. `RapportinoForm`) o in funzioni di utility (es. `utils/formatters.ts`).
    *   **Data Display:** I componenti di visualizzazione (es. tabelle, liste) devono essere il più "stupidi" possibile.

2.  **Componenti Riutilizzabili:** Creare componenti generici e riutilizzabili per elementi UI comuni (es. `ConfirmationDialog`, `ViewInfoRow`) per ridurre la duplicazione del codice.

3.  **Design System:** Si adotta Material-UI (MUI) come libreria di componenti principale. La personalizzazione deve avvenire tramite il sistema di theming di MUI, non con override CSS diretti dove possibile.

---

## 2. Standard di Sintassi Obbligatorio per `Grid` (Sintassi Ibrida)

Questa regola è stata ripristinata dalla cronologia ed è la fonte di verità assoluta per la gestione del layout a griglia in questo progetto.

*   **Scoperta:** L'analisi ha rivelato l'uso di una sintassi "ibrida" per il componente `Grid` di Material-UI, che rappresenta lo standard de-facto per questo progetto.
*   **Importazione Corretta:** Il componente `Grid` deve essere importato dalla libreria stabile:
    '''javascript
    import { Grid } from '@mui/material';
    '''
*   **Sintassi Obbligatoria del Contenitore:** Il componente che funge da contenitore **DEVE** utilizzare la prop `container`:
    '''jsx
    <Grid container spacing={2}>
    '''
*   **Sintassi Obbligatoria degli Elementi Figli:** I componenti che fungono da elementi figli (item) **DEVONO** utilizzare la prop `size` con un oggetto per i breakpoint, **SENZA** la prop `item`:
    '''jsx
    <Grid size={{ xs: 12, sm: 6, md: 4}}>
    </Grid>
    '''
*   **Conclusione Finale:** Questo modello ibrido è la regola. Qualsiasi deviazione da questo standard ha generato errori e deve essere evitata. Questa regola sostituisce tutte le precedenti analisi e ipotesi errate.
