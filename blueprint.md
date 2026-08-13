# Blueprint di Progetto - Piano di Ricostruzione

## REGOLE FONDAMENTALI DI INTERAZIONE

### **DIVIETO ASSOLUTO DI MODIFICA DELL'INTERFACCIA UTENTE**

**NON DEVI TOCCARE LE PARTI VISIBILI DELL'APP: PAGINE, TABELLE, TESTI, LAYOUT O QUALSIASI ALTRO ELEMENTO DELL'INTERFACCIA UTENTE ESISTENTE, A MENO CHE NON VENGA ESPLICITAMENTE E DIRETTAMENTE RICHIESTO.**

---

### **Regola del CIAO**

Ogni mio messaggio in questa chat DEVE iniziare con la parola "CIAO".

---

## Scopo e Stato Attuale

Questo blueprint documenta il **Piano di Ricostruzione** in corso per l'applicazione.

Lo stato precedente del progetto era caratterizzato da un caos architetturale che ha portato a criticità severe di performance, manutenibilità e sicurezza, culminate in un disastroso `git restore` che ha cancellato il lavoro di refactoring. I tentativi precedenti di risolvere bug isolati (come la tabella "categorie" vuota) sono falliti perché ignoravano la natura sistemica dei problemi.

L'obiettivo attuale non è più risolvere bug sintomatici, ma **eseguire un piano di risanamento completo** come definito in `piano_di_recupero.md`, basato sull'analisi delle criticità in `app_master.md`.

---

## Lavori Eseguiti (Correttamente)

1.  **Presa di Coscienza:** Ho letto e compreso i documenti `app_master.md`, `blueprint.md` e `piano_di_recupero.md`, che ora costituiscono l'unica fonte di verità per le mie azioni.
2.  **Correzione Configurazione:** Ho allineato il file `src/config/anagrafiche.config.tsx` alla struttura dati reale delle collezioni `veicoli`, `ditte` e `categorie`.
3.  **Correzione Stato Globale:** Ho modificato `src/stores/globalStore.ts` per includere `categorie` nella definizione dello stato globale, preparandolo a ricevere i dati.

---

## Piano di Lavoro Attuale: REVISIONE CRITICA E CORREZIONE DI ROTTA

**L'analisi precedente era incompleta e pericolosamente errata.** Mi stavo concentrando solo sul frontend, ignorando il vero problema messo in luce dalla criticità **SEC-1 (Modello di Sicurezza Incoerente)**: l'assenza di un backend sicuro e completo per la gestione delle anagrafiche.

È stato rilevato che le operazioni CRUD (Crea, Modifica, Cancella) sono possibili solo per `clienti`, `ditte`, `veicoli` e `tecnici`, in quanto sono le uniche anagrafiche supportate da Cloud Functions dedicate. Per tutte le altre (`navi`, `luoghi`, `categorie`, `tipiGiornata`), i controlli nell'interfaccia utente sono inutili o, peggio, un rischio per la sicurezza dei dati.

Il piano di lavoro viene quindi **azzerato e sostituito** con un approccio corretto che mette la sicurezza e il backend al primo posto.

**FASE 1: Creazione di un Backend Sicuro e Generico (Cloud Functions)**
*   **Azione:** Creare un set di Cloud Functions **generiche** e riutilizzabili per le operazioni CRUD:
    *   `createDocument(collection, data)`
    *   `updateDocument(collection, id, data)`
    *   `deleteDocument(collection, id)`
*   **Obiettivo:** Avere un endpoint unico e sicuro per manipolare qualsiasi anagrafica, eliminando la necessità di creare funzioni specifiche per ogni nuova collezione. Questo risolve il buco di sicurezza per `navi`, `luoghi`, `categorie` e `tipiGiornata`.

**FASE 2: Implementazione della Logica di Autorizzazione (Backend)**
*   **Azione:** All'interno delle nuove Cloud Functions generiche, integrare un controllo dei permessi. Prima di ogni operazione di scrittura (create/update/delete), la funzione verificherà il ruolo dell'utente (es. `admin`) tramite i Custom Claims di Firebase Auth.
*   **Obiettivo:** Centralizzare la logica di sicurezza sul server, come richiesto dalla criticità **DI-2**, garantendo che solo gli utenti autorizzati possano modificare i dati.

**FASE 3: Refactoring e Unificazione del Frontend**
*   **Azione:** Solo una volta che il backend sarà robusto e sicuro, si procederà a:
    1.  Modificare il servizio `src/services/api.ts` per utilizzare le nuove Cloud Functions generiche.
    2.  Completare l'unificazione dei componenti `Gestione*.tsx` (`GestioneTipiGiornata`, `GestioneNavi`, etc.) affinché usino tutti il componente `GestioneAnagrafica.tsx`.
    3.  Assicurarsi che `GestioneAnagrafica.tsx` utilizzi il servizio `api.ts` aggiornato per tutte le operazioni.
*   **Obiettivo:** Avere un'interfaccia utente coerente, funzionante e sicura per tutte le anagrafiche, eliminando definitivamente il codice duplicato e risolvendo le criticità architetturali del frontend.

---

## **CORREZIONE DI ROTTA CRUCIALE (Input Utente)**

**È stato rilevato che il piano precedente, basato sulla sostituzione *totale* di tutte le funzioni di scrittura con le funzioni CRUD generiche, era errato e avrebbe causato un'interruzione critica delle funzionalità per l'app mobile dei tecnici.**

L'utente ha fornito un'informazione fondamentale:
*   I **tecnici sul campo** (che non sono amministratori) devono poter creare `rapportini` tramite la loro app.
*   Questi rapportini creati dall'app mobile contengono campi speciali (es. la firma del cliente) che richiedono una logica di business specifica sul backend.

Questo invalida l'approccio "tutto generico".

**Decisione Strategica Adottata: Modello Ibrido**

Su indicazione dell'utente, il piano è stato aggiornato a un **modello ibrido**, come ora documentato nel `piano_di_recupero.md`:
1.  **Anagrafiche Semplici:** Entità come `clienti`, `navi`, `luoghi`, `categorie`, `ditte`, etc., che sono dati anagrafici gestiti solo da amministratori, utilizzeranno le nuove funzioni **CRUD generiche** (`createDocument`, `updateDocument`, `deleteDocument`). Questo garantisce sicurezza, coerenza e scalabilità.
2.  **Entità Complesse:** Entità con logica di business specifica o permessi di accesso differenziati, come `rapportini` e la gestione dei `tecnici`, **manterranno le loro Cloud Functions dedicate**. Questo preserva le funzionalità esistenti per gli utenti non-admin (i tecnici) e gestisce correttamente i dati speciali (firme).

Il piano di lavoro prosegue quindi con l'implementazione di questa strategia ibrida.
