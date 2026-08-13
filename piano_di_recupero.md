# Piano di Refactoring del Backend: Un Approccio Ibrido

*Questo documento definisce la strategia operativa per risolvere le criticità di sicurezza e architetturali identificate in `app_master.md`, in particolare la criticità `SEC-1` (Modello di Sicurezza Incoerente).*

**Obiettivo Strategico:** Evolvere l'architettura del backend da un modello "una funzione per operazione" a un **modello ibrido** che combini la sicurezza e la scalabilità di funzioni CRUD generiche con la flessibilità di funzioni specifiche per logiche di business complesse.

---

### **FASE 1: Attivazione del Backend CRUD Generico e Sicuro**

*Questa fase attiva le fondamenta della nuova architettura, rendendo disponibili le funzioni generiche già scritte.*

1.  **Analisi `genericCrud.ts`:** Verificare che le funzioni `createDocument`, `updateDocument`, `deleteDocument` contengano i controlli di autenticazione e autorizzazione (verifica del custom claim `admin`). **(FATTO)**
2.  **Modifica `functions/src/index.ts`:** Importare ed esportare le tre funzioni generiche da `genericCrud.ts`. Questo le renderà Cloud Functions chiamabili.
3.  **Mantenimento Funzioni Specifiche:** Assicurarsi che le funzioni esistenti per la gestione dei rapportini e degli utenti (`amministrazione_gestisciUtenti`, etc.) **siano mantenute** e non rimosse, per garantire la continuità operativa dell'app dei tecnici e delle logiche complesse.

---

### **FASE 2: Refactoring del Frontend (Livello Servizi)**

*Questa fase adatta il frontend per comunicare con la nuova architettura ibrida del backend.*

1.  **Modifica `src/services/api.ts`:**
    *   Creare un nuovo "servizio generico" all'interno di `api.ts` che faccia chiamate alle nuove funzioni `createDocument`, `updateDocument`, `deleteDocument`.
    *   Mantenere i servizi esistenti che chiamano le funzioni specifiche (es. per i rapportini).
    *   Esportare le istanze del servizio generico per **tutte le anagrafiche semplici** (clienti, navi, luoghi, categorie, tipiGiornata, veicoli, ditte).

---

### **FASE 3: Refactoring del Frontend (Livello UI)**

*Questa fase finale collega l'interfaccia utente al nuovo livello di servizi, completando la transizione.*

1.  **Aggiorna `GestioneAnagrafica.tsx`:** Modificare il componente per utilizzare il nuovo servizio API generico. Dato che il componente è già progettato per essere generico, questa modifica dovrebbe essere minima e consistere principalmente nel chiamare `api.generic.create(collectionName, data)` invece di una funzione specifica come `api.clienti.create(data)`.
2.  **Verifica Funzionale:** Testare approfonditamente le operazioni di creazione, modifica e cancellazione su **tutte** le tabelle di anagrafica per confermare che:
    *   Le operazioni per le anagrafiche semplici funzionino correttamente tramite il nuovo flusso generico.
    *   Le operazioni su entità complesse (rapportini) continuino a funzionare tramite il loro flusso specifico.
3.  **Chiusura Criticità `SEC-1`:** Una volta completato e verificato, la criticità `SEC-1` potrà essere finalmente segnata come **RISOLTA**.
