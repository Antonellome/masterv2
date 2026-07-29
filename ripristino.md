# Cronologia Ripristino Applicazione - Agosto 2026

Questo documento elenca tutte le correzioni e le modifiche applicate con successo all'applicazione a partire dal ripristino completo ("git reset") fino allo stato attuale.

---

## 1. Stabilizzazione Ambiente di Sviluppo

*   **Problema:** L'applicazione non si avviava. Il terminale mostrava un errore relativo al comando `concurrently`.
*   **Causa:** Lo script `dev` nel file `package.json` tentava di eseguire `vite` e un vecchio script (`node update-server.js`) in parallelo, creando un conflitto che corrompeva il processo di avvio.
*   **Soluzione:** È stato modificato il file `package.json` per rimuovere `concurrently` e lo script obsoleto. Lo script `dev` ora contiene solo il comando `"vite"`, stabilizzando l'ambiente di sviluppo e rendendo possibili le diagnosi successive.

## 2. Correzione Logica di Autenticazione Amministratori

*   **Problema:** Gli utenti amministratori potevano accedere, ma l'applicazione non riconosceva i loro privilegi.
*   **Causa:** Il componente `AuthProvider` si basava su `claims` personalizzati nel token di autenticazione Firebase, una logica non più in uso. La fonte di verità per i permessi era la collezione `admins` in Firestore.
*   **Soluzione:** Il file `src/contexts/AuthProvider.tsx` è stato corretto. La logica basata sui `claims` è stata rimossa e sostituita con una query diretta a Firestore (`getDoc`) dopo il login. Ora, per determinare se un utente è admin, l'app controlla se il suo UID esiste nella collezione `admins`.

## 3. Risoluzione del Problema "ID Sconosciuto" (Anagrafiche)

*   **Problema:** Nelle tabelle di reportistica, al posto dei nomi di tecnici, clienti, navi, ecc., appariva la dicitura "ID Sconosciuto" o "N/D".
*   **Causa:** Il database locale (basato su Dexie.js) aveva una struttura dati obsoleta e corrotta che non distingueva correttamente tra `utenti` e `tecnici`. Il `DataContext`, di conseguenza, non riusciva a creare le mappe di "traduzione" (es. `tecniciMap`) necessarie per convertire gli ID in nomi leggibili.
*   **Soluzione (Architetturale):**
    1.  **Hard Reset del Database Locale:** È stato modificato il file `src/db/db.ts`, definendo un'unica `db.version(1)` che forza la cancellazione delle vecchie tabelle e crea una struttura pulita, con una tabella `tecnici` separata e ben definita.
    2.  **Centralizzazione Dati:** È stato corretto il file `src/contexts/DataContext.tsx` per usare l'hook `useLiveQuery` di Dexie, leggendo i dati direttamente dalle nuove tabelle pulite e generando in tempo reale le mappe (`tecniciMap`, `naviMap`, ecc.) usate in tutta l'applicazione.

## 4. Correzione Calcolo Notturno Speciale "Cartour"

*   **Problema:** Nella tabella "Cumulativi Tecnici", le ore notturne per la nave "Cartour" non venivano calcolate correttamente.
*   **Causa:** La logica di calcolo si basava erroneamente sul timestamp di creazione del rapportino (`dataRapportino`) invece che sul campo specifico che indica l'ora di inizio del lavoro per ogni singolo tecnico (`oraInizio` presente in `dettaglioOreTecnici`).
*   **Soluzione:**
    1.  Dopo un tentativo fallito che ha causato ulteriori bug, il file `src/components/Reportistica/CumulativiTecnici.tsx` è stato ripristinato tramite `git checkout`.
    2.  Successivamente, è stata applicata una modifica chirurgica. La variabile `isNotturnoSpeciale` è stata rimossa. La logica è stata spostata all'interno del ciclo che processa le ore di ogni singolo tecnico. Ora, per ogni tecnico, il codice controlla se la nave è "Cartour" e se la **sua specifica `oraInizio`** è maggiore o uguale a 21. Solo in questo caso le ore vengono classificate come notturne (codice 'N').

## 5. Correzione Formato Visualizzazione Notturno

*   **Problema:** Le ore notturne venivano visualizzate separate dalle altre (es. `8 4N`).
*   **Richiesta:** Il formato doveva essere unificato, senza spazi e con un `+` per le ore non ordinarie (es. `8+4N` o `8+5+2N`).
*   **Soluzione:** È stata riscritta la funzione `formatCellData` nel file `src/components/Reportistica/CumulativiTecnici.tsx`. La nuova funzione costruisce la stringa di testo in modo incrementale, garantendo che le ore straordinarie e notturne siano sempre precedute dal `+` e concatenate senza spazi.

## 6. Risoluzione Esecuzione Sincronizzazione e Crash all'Avvio

*   **Problema:** Una serie di errori critici impediva l'avvio dell'applicazione, tra cui:
    *   `Failed to resolve import` per file inesistenti o percorsi errati.
    *   `You cannot render a <Router> inside another <Router>`.
    *   Errori di `Provider` mancanti (`DataProvider`, `RefreshProvider`).
*   **Causa:** Una riscrittura errata e "a memoria" del file `App.tsx` e la mancanza della configurazione dei `Provider` globali nel punto di ingresso dell'applicazione.
*   **Soluzione (Infrastrutturale):**
    1.  **Correzione Importazioni:** Sono stati corretti tutti i percorsi di importazione errati in `src/App.tsx`.
    2.  **Correzione Routing:** È stato rimosso il `<BrowserRouter>` duplicato da `src/App.tsx` e la struttura delle rotte è stata riorganizzata usando il pattern corretto con `<Outlet>`.
    3.  **Setup dei Provider Globali:** Il file `src/main.tsx` è stato modificato per "avvolgere" l'intera applicazione con tutti i provider di contesto necessari nell'ordine corretto: `AuthProvider`, `DataProvider`, `RefreshProvider`, e `SnackbarProvider` (è stato anche installato il pacchetto `notistack` mancante).

---
