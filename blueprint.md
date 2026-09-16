# BLUEPRINT OPERATIVO - APP MASTER

**Data ultimo aggiornamento:** 17/09/2026

---

## 1. Regole Strategiche Fondamentali

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA.**

1.  **Consultazione del Registro:** Prima di iniziare qualsiasi lavoro o analisi, consultare sempre il file `registro.md`. Esso contiene i dettagli tecnici, la mappa dell'applicazione, la lista delle Cloud Functions e il diario di tutte le modifiche. È la nostra fonte primaria di verità tecnica.

2.  **Separazione Totale delle Cloud Functions:** Esiste una separazione invalicabile tra il backend dell'App Tecnici e quello dell'App Master.
    *   Le funzioni dell'App Tecnici **NON DEVONO MAI** essere toccate, modificate, chiamate o analizzate.
    *   Tutte le funzioni create per l'App Master **DEVONO** iniziare con il prefisso `master_` (es. `master_gestisciAnagrafica`).

3.  **Lavoro per "Zone":** Lo sviluppo procede per sezioni isolate e autonome dell'app (le "zone"). Una zona deve essere completata e testata prima di passare alla successiva. L'ordine è definito nel `registro.md`.

4.  **Regole di Comunicazione:**
    *   Ogni messaggio inizia con "CIAO.".
    *   Se emergono dubbi sulla logica o sul funzionamento dell'app, è obbligatorio fermarsi e chiedere chiarimenti.

---

## 2. Piano di Lavoro Corrente

**ATTENZIONE: QUESTA SEZIONE VERRÀ MODIFICATA AD OGNI AVANZAMENTO.**

*   **ZONA ATTUALE:** **Anagrafiche** (`/anagrafiche/*`)

*   **Obiettivo:** Completare la bonifica della zona assicurando che tutte le operazioni di Creazione, Modifica ed Eliminazione (CRUD) vengano gestite da una nuova Cloud Function dedicata (`master_gestisciAnagrafica`) e che non vi sia alcun accesso diretto a Firestore.

*   **Stato Avanzamento:**
    1.  **Creazione Funzione Backend:** **FATTO** (Funzione `master_gestisciAnagrafica` già deployata come da `registro.md`).
    2.  **Creazione Servizio Frontend:** **FATTO** (Creato `src/services/anagraficheService.ts`).
    3.  **Collegamento UI:** **FATTO** (Modificato `GestioneAnagrafica.tsx` per usare il nuovo servizio).

*   **Passi Successivi:**
    1.  **Verifica e Test:** Provare le operazioni di modifica, creazione e cancellazione da interfaccia per confermare il corretto funzionamento dell'intero flusso (UI -> Servizio -> Cloud Function -> Firestore).
