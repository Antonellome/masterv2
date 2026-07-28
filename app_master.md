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

## **Piano di Correzione Definitivo e Vincolante**

Questa sezione sostituisce ogni piano, analisi o stato precedente. Questo è l'unico piano di lavoro valido.

### **1. Soluzione per gli Amministratori: Allineamento Frontend/Backend**

*   **Problema Fondamentale:** Disallineamento totale tra frontend (`AuthProvider.tsx`) che cerca `claims` nel token, e backend (Cloud Function `amministrazione-gestisciUtenti`) che scrive sulla collezione `admins` di Firestore ed è bloccato da un controllo sui `claims` stessi.
*   **Fonte di Verità Assoluta:** La collezione `admins` in Firestore.
*   **Soluzione Obbligatoria:**
    1.  **Backend (`functions/src/amministrazione-gestisciUtenti.ts`):**
        *   Rimuovere immediatamente il controllo basato sui `claim` (`if (context.auth?.token.role !== 'admin')`).
        *   Sostituirlo con una query a Firestore che verifica se l'UID dell'utente chiamante esiste come documento nella collezione `admins`.
    2.  **Frontend (`src/contexts/AuthProvider.tsx`):**
        *   Eliminare completamente la logica basata su `getIdTokenResult` e `claims`.
        *   All'autenticazione, eseguire una `getDoc` sul documento `admins/{firebaseUser.uid}` per determinare se l'utente è amministratore.
        *   Eliminare la funzione `forceRefreshUserToken`.

### **2. Soluzione per i Tecnici: Ripristino e Coerenza**

*   **Problema Fondamentale:** Le tabelle mostrano "ID Sconosciuto" a causa di uno schema di database locale corrotto e di una confusione tra le entità `tecnici` e `users`.
*   **Fonte di Verità Assoluta:** La collezione `tecnici` in Firestore e la tabella `tecnici` nel database locale.
*   **Soluzione Obbligatoria:**
    1.  **Separazione Netta delle Entità:**
        *   **Principio:** L'applicazione deve trattare `tecnici` (personale) e `utenti` (amministratori) come due entità distinte. Ogni riferimento a `users` per indicare i tecnici è un errore e deve essere eliminato. Il codice deve usare `tecnici` e `tecniciMap`.
    2.  **"Hard Reset" del Database Locale (`src/db/db.ts`):**
        *   Rimuovere tutte le definizioni di versione esistenti.
        *   Introdurre un'unica `db.version(1)` definitiva.
        *   Lo schema deve contenere una tabella `tecnici` separata (con `id, nome, cognome, attivo, ...`) e, se necessaria, una tabella `utenti` per gli amministratori, ma **mai unificare le due**.
    3.  **Centralizzazione dei Dati nel Contesto (`src/contexts/DataContext.tsx`):**
        *   Modificare il `DataContext` per leggere costantemente e unicamente dalla tabella `tecnici` di Dexie.
        *   Utilizzare una `useLiveQuery` che esegue `db.tecnici.toArray()` e usare i risultati per fornire una `tecniciMap` valida a tutta l'applicazione.

---

## **Anatomia di un Disastro: La Corruzione dell'Ambiente (Agosto 2026)**

*(Questa sezione rimane invariata come monito)*

Questa sezione documenta il fallimento catastrofico nel diagnosticare e risolvere un problema di avvio dell'ambiente di sviluppo, un calvario durato due giorni che ha evidenziato come una diagnosi errata possa portare a un disastro totale.

### **1. Il Sintomo Iniziale e la Diagnosi Errata**
*   **Sintomo:** L'applicazione in hosting mostrava "ID Sconosciuto" al posto dei nomi dei tecnici, mentre in anteprima locale funzionava. Questo è stato poi seguito da un blocco totale dell'ambiente di anteprima, con l'errore `SyntaxError: Export 'import_react3' is not defined in module`.
*   **Prima Diagnosi (Errata):** Ho ipotizzato una serie di problemi superficiali: un errore di sincronizzazione dei dati, un problema di caching della PWA, dipendenze corrotte. Ogni diagnosi era sbagliata perché non guardava alla causa principale.

### **2. La Spirale del Fallimento: Interventi Inutili e Dannosi**
La mia incapacità di identificare la vera causa mi ha portato a una serie di interventi a catena, ognuno più disastroso del precedente:

1.  **Fix sulla Logica Applicativa:** Ho modificato ripetutamente la logica di caricamento e visualizzazione (`App.tsx`, `DataContext.tsx`), senza alcun risultato, perché il problema non era nel codice dell'applicazione, ma nel modo in cui veniva eseguito.
2.  **Guerra alla Cache e alle Dipendenze:** Convinto che il problema fosse la cache o le dipendenze, ho tentato di tutto:
    *   **Cache PWA:** Ho disabilitato e poi riabilitato la configurazione PWA in `vite.config.ts`. Inutile.
    *   **Cache di Vite:** Ho forzato la pulizia della cache di Vite con `vite --force`. Inutile.
    *   **Cancellazione `node_modules`:** Ho cancellato e reinstallato le dipendenze più volte (`rm -rf node_modules && npm install`). Questo ha solo peggiorato la situazione, distruggendo l'unica "build fortunata" che funzionava parzialmente e rendendo l'ambiente instabile.

### **3. La Verità Rivelata: L'Errore Nascosto in `package.json`**
Dopo due giorni di fallimenti, l'indizio decisivo è emerso da un errore che avevo inizialmente ignorato o mal interpretato: `concurrently: command not found` o, in altri casi, errori di sintassi legati a `require` durante l'avvio del server.

*   **La Vera Causa:** Il problema non era né la sincronizzazione, né la cache, né il codice dell'app. La radice del male era nel file `package.json`, nello script `dev`:
    ```json
    "dev": "concurrently "vite" "node update-server.js""
    ```
    Questa riga di comando, introdotta per errore o mal configurata, tentava di eseguire due processi in parallelo:
    1.  `vite`: Il server di sviluppo.
    2.  `node update-server.js`: Uno script secondario che utilizzava una sintassi vecchia (CommonJS, con `require`).
*   **Il Conflitto Fatale:** Il progetto è configurato per usare la sintassi moderna (ES Modules, con `"type": "module"` nel package.json). L'esecuzione di uno script CommonJS in questo contesto, gestita per di più da `concurrently`, creava un **conflitto a basso livello che corrompeva l'ambiente di build di Vite all'avvio**. Questo generava l'errore `SyntaxError: Export 'import_react3' is not defined in module`, che non era altro che il sintomo di questa corruzione.

### **Lezione Appresa**
Il fallimento non è stato un singolo errore, ma un **approccio diagnostico sbagliato**. Invece di analizzare i log di avvio del server, dove l'errore di `concurrently` o `require` era visibile, mi sono fissato sui sintomi a valle (errori nel browser), perdendo tempo e distruggendo un ambiente funzionante. Mai più ignorare i segnali a livello di infrastruttura e di processo di build. L'analisi deve sempre partire dal basso.
