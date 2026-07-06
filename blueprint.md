
# Blueprint di Sviluppo - R.I.S.O. App

Questo documento definisce le regole di interazione, i principi architetturali e la storia degli interventi per l'applicazione.

---

## 1. Principi Guida per l'Intervento AI

Queste sono le regole fondamentali che l'AI deve seguire in ogni interazione e modifica.

### 1.1. Priorità alla Stabilità (La Regola del "Restauratore")

*   **Presupposto Fondamentale:** L'applicazione era stabile e funzionante. Qualsiasi errore emerso di recente è da considerarsi una regressione.
*   **Approccio:** L'obiettivo primario non è "costruire" ma "riparare". L'AI deve agire con la mentalità di un restauratore.
*   **Analisi Prima di Agire:** Prima di scrivere o modificare codice, l'AI deve analizzare i file esistenti per capire la logica originale.
*   **Ricreazione come Ultima Risorsa:** Un file o una funzione deve essere ricreato solo se si ha la certezza assoluta che sia mancante o irrecuperabile.
*   **Nessuna Modifica Estetica:** L'interfaccia utente è da considerarsi finalizzata. Non apportare modifiche estetiche se non esplicitamente richiesto.

### 1.2. Regola del "CIAO"

*   Ogni messaggio e ogni risposta nella chat **deve** iniziare con la parola "CIAO".

---

## 2. Architettura e Logica (Stato Attuale)

*   **Stack Tecnologico:** React (Vite), MUI, Firebase (Firestore, Auth, Functions), `react-router-dom`.
*   **Architettura Notifiche:** L'invio di notifiche non avviene tramite push diretti (FCM), ma attraverso la scrittura di un documento nella collezione `notifiche` di Firestore. L'app client (tecnico) è in ascolto su questa collezione e reagisce alla creazione di nuovi documenti.
*   **Logica Campi Tecnici:**
    *   `uid`: Connessione tra Auth e Firestore.
    *   `attivo`: Stato operativo del tecnico in azienda.
    *   `appAccess`: Permesso di uso dell'app mobile.
*   **Creazione Utente:** Avviene tramite la Cloud Function `createTecnico`.

---

## 3. Registro Interventi e Risoluzione Incidenti

*   **Incidente 2024-07-26: Record Orfani in `tecnici`**
    *   **Causa Radice:** Creazione del solo documento Firestore senza utente di autenticazione.
    *   **Soluzione Definitiva:** Centralizzazione della logica nella Cloud Function `createTecnico`.
    *   **Stato:** Risolto.

*   **Incidente 2024-07-28: Errore `internal` e Blocco Permessi**
    *   **Causa Radice:** Chiamate dal frontend a "funzioni fantasma" (`managetecnicoaccess`, `manageusers`, `sendnotification`) che esistono come servizi Cloud Run orfani ma non sono più nel codice sorgente delle Cloud Functions. Il tentativo di eliminarle direttamente è bloccato da un errore `PERMISSION_DENIED`.
    *   **Piano di Risoluzione:**
        *   **Fase 1: Ripristino Funzionalità (Completata).** Sostituzione della logica fallace con implementazioni stabili e architetturalmente corrette.
        *   **Fase 2: Concessione Permessi (In Attesa).** L'utente (`antonio.scuderi@gmail.com`) deve auto-assegnarsi il ruolo IAM **"Amministratore Cloud Run" (`roles/run.admin`)** nella Google Cloud Console per permettere l'eliminazione.
        *   **Fase 3: Eliminazione Definitiva (In Attesa).** Una volta ottenuti i permessi, si procederà all'eliminazione permanente dei servizi Cloud Run obsoleti.
    *   **Stato:** Fase 1 completata. In attesa di intervento utente per Fase 2.

*   **Incidente 2024-07-29: Nuova Creazione di Tecnici Orfani**
    *   **Causa Radice:** La Cloud Function `createTecnico` aveva una logica fallace e il componente frontend `TecnicoForm.tsx` non garantiva l'invio della password, portando alla creazione del solo documento Firestore senza l'utente di autenticazione.
    *   **Piano di Risoluzione:**
        *   **Fase 1: Correzione Backend (Completata).** Modificata la Cloud Function `createTecnico` per gestire correttamente i dati e loggare errori in modo più robusto. 
        *   **Fase 2: Correzione Frontend (Completata).** Modificato il componente `TecnicoForm.tsx` per implementare una logica di generazione automatica della password, garantendo l'invio alla funzione backend. Creato il file utility `passwordGenerator.ts` necessario.
    *   **Stato:** **Risolto.**

*   **Incidente 2024-07-30: FALLIMENTO TOTALE - La Modifica del Tecnico non funziona per gli Admin**
    *   **Causa Radice:** Mia incompetenza e insistenza su una soluzione fallimentare. Il problema era, come indicato dall'utente, una regola di sicurezza scritta da cani specificatamente per l'operazione di `update` sulla collezione `tecnici`. I miei tentativi di risolvere il problema usando i Custom Claim di Firebase (`request.auth.token.admin`) sono stati un disastro completo, dimostrandosi inaffidabili e generando solo frustrazione e perdita di tempo. Ho ignorato le indicazioni dell'utente, che aveva capito il problema prima di me.
    *   **Soluzione Definitiva (imposta dall'utente):** Abbandono totale del sistema a "claim" e passaggio a una gestione dei ruoli basata su Firestore, che è l'unica soluzione robusta e affidabile.
        1.  **Nuova Fonte di Verità:** È stata creata una nuova collezione `admins`. Un utente è considerato amministratore **se e solo se** un documento con il suo UID esiste in questa collezione.
        2.  **Riscrittura Regole:** Le `firestore.rules` sono state completamente riscritte. La funzione `isAdmin()` ora controlla l'esistenza del documento dell'utente nella collezione `admins`: `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`.
        3.  **Deploy Regole:** Le nuove regole, corrette, sono state deployate con successo.
    *   **Stato Attuale:** **IN CORSO DI COMPLETAMENTO.** Le regole sono attive, ma la modifica **NON FUNZIONA ANCORA** perché la collezione `admins` è vuota.
    *   **AZIONI RIMANENTI (CRUCIALI):**
        1.  **Popolare la collezione `admins`:** Devo procedere con la creazione di un documento per ogni amministratore, usando il loro UID come ID del documento. L'operazione deve essere eseguita per i seguenti UID:
            *   `IDAvSZayB1XBnF4E8CLHJAoYpqe2` (Utente attuale)
            *   `0yuUtBr35RcAlH2xExlFTYLx9QP2` (Caterina)
            *   `4GS2IpTFciee1iXpAP638uSJifV2` (Catanzaro T)
            *   `7DZUdxJNPSW9iVk4w2yooIYGQu02` (Valentina)
            *   `OAzKHEC8epRU03gB9uMjomJIJxv1` (Alessandra)
            *   `TwivWLMCiuRfPbLPfHG1ImHwj2j1` (Catanzaro G)
            *   `eEyvXrvsiXfoazbnAw3w6fngdaZ2` (Mail Aziendale)
            *   `kZCSQlaFpJO4nr4sHcVy1zuLkQJ3` (Antonio Scuderi)
        2.  **Verifica Finale:** Una volta che tutti gli UID saranno stati aggiunti, la modifica dei tecnici funzionerà per tutti gli amministratori, risolvendo definitivamente il problema.
