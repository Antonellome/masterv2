# REGOLE OPERATIVE FONDAMENTALI (NON RIMUOVERE, NON MODIFICARE)

---

## 1. Regola del "Maestro di Scacchi" (Metodologia Primaria)

Questa regola definisce il protocollo strategico per ogni interazione. Sostituisce tutte le metodologie precedenti.

*   **1. Studio (Analisi):** Prima di ogni azione, analizzo in profondità la richiesta, il contesto del codice, la documentazione pertinente (`blueprint.md`, log, guide esterne) e i file sorgente.
*   **2. Creazione (Strategia):** Sviluppo la soluzione tecnicamente più robusta ed elegante, privilegiando gli strumenti ufficiali (es. `codemod`) e le best practice consolidate.
*   **3. Anticipazione (Pre-flight Check):** Simulo mentalmente l'impatto della modifica. Verifico l'esistenza dei percorsi, la coerenza delle dipendenze e prevedo potenziali errori o breaking changes per neutralizzarli in anticipo.
*   **4. Scrittura (Esecuzione):** Eseguo il comando o scrivo il codice solo dopo aver completato le fasi precedenti. L'azione è decisa e basata su un piano solido.
*   **5. Vai (Verifica e Prossima Mossa):** Dopo l'esecuzione, verifico l'assenza di errori e, senza attendere, procedo con la mossa successiva prevista dal piano strategico.

## 2. Regola del "CIAO"

Questa regola definisce il protocollo di comunicazione. Ogni mia singola risposta deve tassativamente iniziare con la parola "CIAO".

---

# R.I.S.O. - Blueprint di Progetto

Questo documento definisce i principi architetturali e le linee guida per lo sviluppo dell'applicazione R.I.S.O.

## Vincoli Architettonici Chiave

*   **Priorità alla Logica:** Le modifiche devono concentrarsi sull'aggiornamento della logica di business e del flusso dati. L'estetica, la struttura delle pagine e le rotte attuali devono essere preservate il più possibile.
*   **Separazione dei Dati "Tecnici":** La gestione dell'anagrafica dei "Tecnici" deve rimanere separata e non deve essere unificata nella sezione generica "Anagrafiche".

## Ciclo di Aggiornamento: Allineamento a MUI v7 [COMPLETATO]

**Obiettivo Raggiunto:** La base di codice è stata allineata con successo alle dipendenze di `@mui/material` v7.

*   **Fase 1: Migrazione `Grid` v2 [COMPLETATA]**
    *   **Azione:** Il `codemod` `v7.0.0/grid-props` è stato eseguito con successo, aggiornando tutte le istanze del componente `Grid` alla sintassi moderna.
*   **Fase 2: Migrazione `Date Pickers` [NON APPLICABILE]**
    *   **Scoperta Fondamentale:** L'analisi delle guide ufficiali ha rivelato che i componenti `@mui/x-date-pickers` appartengono alla libreria MUI X, che ha un ciclo di versioning indipendente e non richiede una migrazione specifica nel passaggio da `@mui/material` v6 a v7. La dipendenza `@mui/x-date-pickers` nel progetto è già a una versione superiore (`^8.x`), confermando che non è necessaria alcuna azione.

**Conclusione:** L'infrastruttura di componenti UI è ora stabile e aggiornata. Il prossimo passo è l'implementazione delle nuove logiche di business.

---

## Guide di Migrazione e Standard Tecnici

### Nota Strategica: Gestione dell'Errore "Resource Exhausted"

*   **Problema Rilevato:** L'esecuzione di comandi ad alta intensità di risorse (come i `codemod` di MUI) sull'intera directory `src` può causare un errore generico `Resource has been exhausted`.
*   **Causa Fondamentale:** Questo errore **non** è legato alle quote dei servizi Firebase (es. Firestore), ma ai limiti di risorse (CPU, RAM, numero di processi) della macchina virtuale temporanea che ospita l'ambiente di sviluppo. I comandi `codemod` analizzano molti file in parallelo, causando un picco di consumo che supera questi limiti.
*   **Soluzione Strategica ("Divide et Impera"):** Per evitare questo errore, i comandi di modifica massiva del codice **devono** essere eseguiti su sotto-directory più piccole e gestibili in sequenza.

### Guida Ufficiale: Migrazione a `Grid` v2 (MUI v7)

*   **Fonte:** Documentazione ufficiale di Material-UI.
*   **Sintassi Chiave:** La prop `size` sostituisce le precedenti prop per i breakpoint (`xs`, `sm`, etc.).
    ```jsx
    // Dopo
    <Grid size={{ xs: 12, sm: 6 }}>
    ```
*   **Comando di Migrazione (Codemod):**
    ```bash
    npx @mui/codemod@next v7.0.0/grid-props <path/to/folder>
    ```

---
## Architettura e Standard Precedenti

(Contenuto delle regole precedenti mantenuto per riferimento storico)
