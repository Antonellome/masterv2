# Mappa Concettuale Applicazione "Gestione Lavoro SRL" (app_master.md)

**Scopo del Documento:** Questo documento è la fonte unica della verità sull'architettura, la logica e il flusso dei dati dell'applicazione. Nasce dalla necessità di eliminare incertezze, errori ripetuti e "lavori inutili". Ogni futura modifica o correzione dovrà obbligatoriamente partire dalla consultazione di questa mappa. L'analisi è certosina, file per file, senza dare nulla per scontato.

---

## **Metodologia di Analisi**

*(Omissis)*

---

## **Principi Architettonici Fondamentali**

*(Omissis)*

---

## **Elenco delle Criticità Architetturali e Funzionali Rilevate**

*   **[C-1] Logica di Sincronizzazione Collocata in Modo Improprio:**
    *   **Stato:** **NON RISOLTO - CRITICITÀ BASSA.**

*   **[C-2] Incoerenza degli Indici nel Database Locale:**
    *   **Stato:** **RISOLTO**.

*   **[C-3] Sincronizzazione Anagrafiche NON Incrementale:**
    *   **Stato:** **RISOLTO**.

*   **[C-4] Eliminazione Diretta Online che Viola il Pattern Offline-First:**
    *   **Stato:** **NON RISOLTO - CRITICITÀ MEDIA.**

*   **[C-5] Bug Funzionale Grave in Cumulativi Tecnici:**
    *   **Stato:** **NON RISOLTO - CRITICITÀ ALTA.**

*   **[C-6] Violazione Totale del Pattern Offline-First in Analisi Ore:**
    *   **File:** `src/components/Reportistica/AnalisiOre.tsx`
    *   **Descrizione:** L'intero componente opera con query dirette a Firestore, ignorando completamente il database locale Dexie.js. Questo non solo rende la funzionalità inutilizzabile offline, ma contraddice l'intera architettura applicativa, creando un'isola di funzionamento "solo online" all'interno di un'app pensata per essere offline-first.
    *   **Stato:** **NON RISOLTO - CRITICITÀ MASSIMA.**

---

## **Analisi Gerarchica dei Componenti**

**Stato Analisi:** Completata la Fase 5.

### **Fase 1-4: Struttura Globale, Contesti, Pagine e Servizi**

*(Omissis)*

### **Fase 5: Analisi dei Componenti di Reportistica**

*(Omissis)*

#### **5.4 `src/components/Reportistica/AnalisiOre.tsx`**
*   **Scopo:** Fornire una dashboard di analisi dei costi e delle ore lavorate, con grafici e totali aggregati.
*   **Logica & Struttura:**
    1.  **Fonte Dati Online:** Il componente si basa esclusivamente su `useCollectionData` e `getDocs` che interrogano **direttamente Firestore**. Questa è la causa della criticità **[C-6]**.
    2.  **Filtraggio Misto:** La logica di filtro è ibrida e inefficiente. Filtra per data su Firestore, ma poi esegue tutti gli altri filtri (per categoria, cliente, nave, etc.) sul client, dopo aver ricevuto i dati.
    3.  **Logica di Calcolo:** La logica per calcolare costi e ore (`analisi`) è ben strutturata e resiliente, con controlli per dati mancanti.
*   **Criticità Rilevate:** **[C-6]**. Il componente è un'anomalia architetturale che deve essere completamente riscritta per utilizzare la fonte dati locale (Dexie.js).

**Prossimo Passo dell'Analisi:** **STOP all'analisi di nuove funzionalità.** La Fase 5 ha rivelato criticità troppo gravi per essere ignorate. La priorità assoluta ora è la **risoluzione dei problemi**, partendo dal bug bloccante **[C-5]** che rende inutilizzabile la sezione "Cumulativi Tecnici". Inizierò a formulare un piano di debug e correzione per questo componente.

---
