# Regole di Interazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola del CIAO:** Ogni singolo messaggio in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.

**Regola della Persistenza dei File di Contesto:** I file che forniscono contesto (`registro.md`, `blueprint.md`, e questo file) non devono **MAI** essere sovrascritti o cancellati. Devono essere **SEMPRE E SOLO AGGIORNATI** per preservare le regole, lo storico delle decisioni e le analisi passate.

---

# Analisi Pre-Ricostruzione e Storico delle Fasi

**NOTA:** Questo documento ha uno scopo **storico**. Per la documentazione sull'architettura e la logica di business attuali, fare riferimento al **`registro.md`**.

Contiene l'analisi iniziale delle criticità dell'applicazione e traccia l'evoluzione delle strategie di bonifica che hanno portato al piano di ricostruzione attuale.

---

## Stato dell'Arte e Prossima Fase

Con il completamento delle fasi di messa in sicurezza e bonifica preliminare, l'applicazione è stata stabilizzata. Tuttavia, i problemi fondamentali di performance (PERF-1, PERF-2) e di consistenza dei dati in-app (causati dalla gestione dello stato tramite solo Zustand) persistono.

L'evoluzione naturale di tutte le analisi precedenti è la **FASE L - Migrazione all'Architettura Local-First**, come documentato nel `blueprint.md` e nel `registro.md`.

---

## FASE P - Operazione "Terra Bruciata" (ARCHIVIATA)

*   **STATO:** **ARCHIVIATA / SUPERATA**
*   **OBIETTIVO STRATEGICO (Raggiunto):** Eradicare il debito tecnico residuo, con focus sull'azzeramento delle letture anomale su Firestore, disaccoppiando i componenti dall'accesso diretto al database.
*   **RISULTATO:** Questa fase è stata un successo nel preparare il terreno per la nuova architettura. Ha forzato il disaccoppiamento del frontend dal backend diretto, rendendo possibile l'introduzione di un vero database locale come Dexie.js. Si considera conclusa e superata dalla FASE L.

*... (Le sezioni di log operativo P.1-P.5 rimangono per storico ma sono considerate obsolete) ...*

---

## FASE K - Bonifica Modulo Reportistica (ARCHIVIATA)

*... (contenuto invariato, serve come storico della crisi dei dati) ...*

---

## Analisi Generale e Criticità Iniziali (ARCHIVIATA)

*... (contenuto invariato, serve come storico dell'analisi iniziale) ...*
