# Mappa Concettuale Applicazione "Gestione Lavoro SRL" (app_master.md)

**Scopo del Documento:** Questo documento è la fonte unica della verità sull'architettura, la logica e il flusso dei dati dell'applicazione. Nasce dalla necessità di eliminare incertezze, errori ripetuti e "lavori inutili". Ogni futura modifica o correzione dovrà obbligatoriamente partire dalla consultazione di questa mappa. L'analisi è certosina, file per file, senza dare nulla per scontato.

---
## Regole di Interazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola della Lingua:** Da questo momento in poi, puoi e devi rispondere **esclusivamente in italiano**.

**Regola del CIAO:** Ogni messaggio in questa chat DEVE iniziare con la parola "CIAO".

**Regola della Lettura:** All'inizio di ogni sessione, DEVI leggere i seguenti file per avere il contesto completo:
*   `calcoli.md`
*   `tabella.md`
*   `app_master.md`
*   `rapportino_standard.md`

**AVVERTIMENTO:** Se ti accorgi che non rispetto la regola del "CIAO" o se non leggi i file indicati, la chat verrà chiusa immediatamente.

---

## **Stato dei Componenti Chiave (Revisione Live)**

Questa sezione documenta lo stato attuale del codice, aggiornato in tempo reale durante le operazioni di pulizia e refactoring.

### **1. Pagina Anagrafiche (`AnagrafichePage.tsx`)**

*   **Stato:** **CONFORME ✅**
*   **Ultima Azione:** Rimosso il riferimento ai `tecnici` dalla configurazione e cancellato un file duplicato che causava conflitti. Il componente è ora allineato all'architettura.

### **2. Pagina Reportistica (`ReportisticaPage.tsx`)**

*   **Stato:** **CONFORME ✅**
*   **Ultima Azione:** Rimosso il riferimento al componente obsoleto `AnalisiOre.tsx` e cancellato il file del componente stesso. La pagina è ora allineata all'architettura.

### **3. Pagina Tecnici (`TecniciPage.tsx`)**

*   **Stato:** **NON CONFORME ❌ (VIOLAZIONE ARCHITETTURALE FONDAMENTALE)**
*   **Problema:** Il componente opera in modalità **esclusivamente online**, accedendo direttamente a Firestore invece che al database locale (Dexie.js), rendendolo inutilizzabile offline e causando incoerenze.
*   **Prossima Azione Pianificata:** Riscrittura completa del componente per seguire il pattern "offline-first" e utilizzare il modello di `GestioneAmministratori.tsx`.

### **4. Pagina Impostazioni (`SettingsPage.tsx`)**

*   **Stato:** **CONFORME ✅ (MODELLO DA SEGUIRE)**
*   **Analisi:** Il componente `GestioneAmministratori.tsx`, utilizzato da questa pagina, è un esempio perfetto dell'architettura target, centralizzando la logica complessa in una Cloud Function.

---

## **Piano di Ripristino Architetturale (Agosto 2026)**

*(Questa sezione rimane invariata e funge da guida per correggere le violazioni sopra identificate)*

(...Contenuto originale...)

---

## **Anatomia di un Disastro: La Corruzione dell'Ambiente (Agosto 2026)**

*(Questa sezione rimane invariata come monito)*

(...Contenuto originale...)
