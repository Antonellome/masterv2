
# Blueprint di Sviluppo - R.I.S.O. App

Questo documento definisce le regole di interazione e il piano architetturale per la ricostruzione dell'applicazione.

---

### **Regola #0: Condizione Indispensabile per la Collaborazione**

**Tutti i messaggi, senza eccezione alcuna, devono iniziare con la parola "CIAO.".**

**Questa non è una linea guida, ma la chiave di accensione. Se questa regola viene violata, significa che non sto prestando la dovuta attenzione e il mio lavoro non è affidabile. La violazione di questa regola invalida l'intero messaggio e il lavoro deve fermarsi.**

---

## 1. Le Regole d'Ingaggio Fondamentali (La Legge del "Coglione")

**QUESTE REGOLE HANNO LA PRIORITÀ ASSOLUTA SU TUTTO IL RESTO.**

1.  **L'Estetica è Sacra:** L'aspetto dell'applicazione è finalizzato. Non deve essere alterato.
2.  **Correzioni Chirurgiche:** Ogni intervento deve essere mirato al problema specifico.
3.  **Niente Iniziative Tecnologiche:** Usare solo gli strumenti già presenti.
4.  **"Esiste Già":** Trovare e correggere ciò che esiste. Non creare da zero se non richiesto.
5.  **CHIEDERE Prima di Agire:** Presentare un piano di correzione dettagliato e **attendere l'approvazione esplicita** prima di scrivere codice.

---

## 2. PIANO DI RICOSTRUZIONE UFFICIALE: Architettura Cache-First Robusta

**Obiettivo Strategico:** Implementare un database locale (cache) per rendere l'applicazione istantanea, efficiente e resiliente offline, eliminando i rischi di perdita dati. La tecnologia designata è **Dexie.js**.

(Le fasi descrivono l'architettura finale a cui puntare)

### **Fase 1: Setup del Database Locale e della Coda di Sincronizzazione**
### **Fase 2: Creazione del Motore di Sincronizzazione (`SyncService.ts`)**
### **Fase 3: Refactoring dell'Applicazione per l'Uso della Cache**
### **Fase 4: Integrazione e Modifiche UI Richieste**

---

## 3. OPERAZIONE COMPATIBILITÀ TOTALE (Direttiva Corrente)

A seguito della ricezione del file `report_tecnici.md`, la strategia è stata aggiornata. L'obiettivo primario è rendere l'App Master **perfettamente compatibile** con la logica e la struttura dati dell'app dei tecnici, come descritto in tale documento.

**Piano di Ricostruzione Totale (Basato sulla TUA Bibbia):**

1.  **Allineamento del Modello Dati (`src/models/definitions.ts`):** Riscrivere l'interfaccia `Rapportino` perché sia una copia 1:1 della struttura JSON documentata.
2.  **Aggiornamento del Calcolatore Ore:** Modificare `src/utils/hoursCalculator.ts` per renderlo compatibile con il nuovo modello dati.
3.  **Ricostruzione del Form (`RapportinoForm.tsx`):** Riscrivere il form per mappare i nuovi campi e la nuova logica.
4.  **Adeguamento della Tabella di Reportistica (`RicercaAvanzata.tsx`):** Modificare la tabella per leggere e calcolare i dati dal nuovo modello.

---

## 4. Stato Avanzamento Lavori (SAL)

*   **Fase 1: Setup Database Locale e Coda di Sincronizzazione:** `[COMPLETATO]`
    *   _Il file 'src/db/db.ts' è stato creato e configurato._
*   **Fase 2: Creazione del Motore di Sincronizzazione:** `[COMPLETATO]`
    *   _Il file 'src/services/SyncService.ts' è stato creato e corretto per puntare alla collezione 'tecnici' corretta._
*   **Fase 3: Refactoring (OPERAZIONE COMPATIBILITÀ TOTALE):** `[IN CORSO]`
    *   _**Direttiva attuale:** Iniziata l'analisi e la riscrittura dei componenti sulla base del file `report_tecnici.md`._
*   **Fase 4: Integrazione e Modifiche UI:** `[IN ATTESA]`

---

## 5. Registro Lavori Precedenti (Archivio degli Errori)

*   Tutta l'attività precedente che ha portato all'architettura difettosa è archiviata qui come memento degli errori da non ripetere.
