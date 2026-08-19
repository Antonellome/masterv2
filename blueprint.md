# Blueprint Architetturale Unificato

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICata O CANCELLATA.**

**Regola del CIAO:** Ogni singolo messaggio in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.

---
## **FASE O: Ricostruzione Funzionale del Modulo di Gestione Rapportini (Piano Attuale)**

*   **STATO:** **ATTIVO.**
*   **OBIETTIVO STRATEGICO:** Rendere il modulo di gestione dei rapportini nell'App Master pienamente operativo, riparando le funzionalità di visualizzazione, modifica, eliminazione e creazione che sono attualmente non funzionanti nonostante il ripristino del flusso dati dal backend.

### **Diagnosi Post-Fase N**

Il successo della Fase N.1 ha ripristinato la corretta fornitura di dati dal backend (`getAllRapportiniForSync` ora invia tutti i documenti). Tuttavia, l'interfaccia utente è collassata, dimostrando di non essere pronta a gestire i dati. Le criticità sono:
1.  **Visualizzazione Dettaglio Rotta:** Cliccando su un rapportino si apre una modale con layout corrotto ("cornice nera"), contenuto non scrollabile e illeggibile.
2.  **Azioni CRUD Inoperative:** I pulsanti per Modificare (`matita`), Eliminare (`cestino`) e Creare un nuovo rapportino non producono alcun risultato o sono disabilitati. Le chiamate alle Cloud Functions sicure non vengono attivate.

### **Piano di Ricostruzione Sequenziale del Frontend**

*   **O.1 - Riparazione della Visualizzazione Dettaglio (`RapportinoView`):**
    *   **File Target Probabili:** `RapportiniList.tsx`, `RapportinoView.tsx` (o componenti modali equivalenti).
    *   **Azione:** Isolare il componente che renderizza la vista di dettaglio del singolo rapportino. Riscrivere il suo layout e CSS per garantire che:
        1.  Il contenitore (probabilmente un `Dialog` o `Modal` di MUI) sia dimensionato correttamente.
        2.  Il contenuto sia scrollabile orizzontalmente e verticalmente per visualizzare tutti i campi.
        3.  La "cornice nera" e altri artefatti di stile vengano eliminati.
    *   **Obiettivo:** Un utente deve poter cliccare su qualsiasi rapportino in tabella e visualizzarne tutti i dettagli in modo chiaro e completo.

*   **O.2 - Ripristino Funzionalità "Elimina" (`deleteRapportino`):**
    *   **File Target Probabili:** `RapportiniList.tsx`, `useRapportini.ts`, `rapportiniService.ts`.
    *   **Azione:**
        1.  Tracciare il gestore `onClick` del pulsante di eliminazione.
        2.  Verificare che l'ID del rapportino (`rapportinoId`) sia correttamente recuperato.
        3.  Assicurarsi che venga invocata una funzione del service layer che a sua volta chiami la Cloud Function `deleteRapportino`.
        4.  Implementare una finestra di dialogo di conferma (`ConfirmationDialog`) prima di procedere con un'operazione distruttiva.
    *   **Obiettivo:** L'amministratore può eliminare un rapportino in modo sicuro, previa conferma.

*   **O.3 - Ripristino Funzionalità "Modifica" (`updateRapportino`):**
    *   **File Target Probabili:** `RapportinoEdit.tsx`, `RapportinoForm.tsx`, `rapportiniService.ts`.
    *   **Azione:**
        1.  Verificare che il pulsante di modifica navighi correttamente a una pagina di modifica (es. `/rapportino/edit/:id`), passando l'ID del rapportino.
        2.  Analizzare la pagina di modifica per assicurarsi che carichi i dati del rapportino specificato.
        3.  Riparare il form di modifica e il suo gestore di submit per garantire che chiami la Cloud Function `updateRapportino` con i dati aggiornati.
    *   **Obiettivo:** L'amministratore può aprire, modificare e salvare le modifiche a un rapportino esistente.

*   **O.4 - Ripristino Funzionalità "Crea" (`createRapportino`):**
    *   **File Target Probabili:** `NuovoRapportinoPage.tsx`, `RapportinoForm.tsx`.
    *   **Azione:**
        1.  Controllare il pulsante "Crea Nuovo Rapportino" e la sua rotta di navigazione.
        2.  Ispezionare e riparare il form di creazione.
        3.  Garantire che al submit venga chiamata la Cloud Function `createRapportino` e che l'interfaccia utente si aggiorni di conseguenza.
    *   **Obiettivo:** L'amministratore può creare un nuovo rapportino da zero.

*   **O.5 - Deploy e Convalida:**
    *   **Azione:** Al termine delle correzioni, eseguire un test completo del ciclo CRUD (Create, Read, Update, Delete) per i rapportini. Eseguire il deploy.
    *   **Obiettivo:** Un modulo di gestione rapportini stabile, funzionante e affidabile.

---

## **FASE N: Correzione Definitiva del Backend e Allineamento Dati (Piano Superato)**

*   **STATO:** **COMPLETATO E SUPERATO DALLA FASE O.**
*   **POST-MORTEM:** La fase ha avuto successo nel suo obiettivo primario: la funzione `getAllRapportiniForSync` è stata corretta e ora fornisce un flusso di dati completo e valido al frontend. Questo ha rivelato la totale inadeguatezza dell'interfaccia utente, rendendo necessaria la creazione della Fase O. Anche il bug delle anagrafiche (`syncAllAnagrafiche`) è stato implicitamente risolto, dato che i tecnici ora vengono visualizzati.

---

## **FASE M: Risoluzione Flusso Dati Reportistica e Allineamento UI (Piano Superato)**

*   **STATO:** **FALLITO E SUPERATO DALLA FASE N.**
*   **POST-MORTEM:** Il piano era basato su una diagnosi parzialmente corretta ma l'esecuzione è fallita perché non si è riusciti a risolvere i problemi reali nel backend. I tentativi di correggere il frontend sono stati inutili.

---

## **FASE L: Unificazione Architetturale Modulo Reportistica (Piano Superato)**

*   **STATO:** **SUPERATO DALLA FASE M.**

---

## Obiettivo Strategico: Stabilità e Sicurezza

L'obiettivo primario è trasformare questa applicazione da un prototipo client-heavy, insicuro e instabile a un prodotto di livello enterprise.

---

## Diagnosi Architetturale Consolidata

L'analisi ha rivelato criticità sistemiche che minano l'intera applicazione.

---

## Fasi di Refactoring Archiviate (COMPLETATE)

*   **FASE J: Risoluzione Conflitto di Regioni**
*   **Fase H: Correzione Errori di Build Residui**
*   **Fase G: Refactoring Finale della Pagina Presenze**
*   **Fase F: Eliminazione del Debito Tecnico Architetturale**
*   **Fase E: Risoluzione Errore di Avvio "Profilo non trovato"**
*   **Fase D: Sincronizzazione Anagrafiche**
*   **Fase B: Ristrutturazione della Logica di Sincronizzazione (Rapportini)**
*   **Fase A: Sicurezza e Stabilizzazione Immediata (Rapportini)**
*   **Fase 1 (pre-refactoring): Ristrutturazione del Sistema di Autenticazione e Permessi**
