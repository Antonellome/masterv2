
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
    *   **Piano di Risoluzione (In Corso):**
        *   **Fase 1: Ripristino Funzionalità (Completata).** Sostituzione della logica fallace con implementazioni stabili e architetturalmente corrette.
        *   **Fase 2: Concessione Permessi (In Attesa).** L'utente (`antonio.scuderi@gmail.com`) deve auto-assegnarsi il ruolo IAM **"Amministratore Cloud Run" (`roles/run.admin`)** nella Google Cloud Console per permettere l'eliminazione.
        *   **Fase 3: Eliminazione Definitiva (In Attesa).** Una volta ottenuti i permessi, si procederà all'eliminazione permanente dei servizi Cloud Run obsoleti.
    *   **Stato:** Fase 1 completata. In attesa di intervento utente per Fase 2.

### Dettaglio Interventi Fase 1 (Incidente 2024-07-28)

**1. Riparazione `managetecnicoaccess`:**
*   **Backend:** Creata nuova Cloud Function `risorseUmane_gestisciAccessoTecnico` in `functions/src/risorseUmane-gestisciAccessoTecnico.ts` per gestire l'abilitazione/disabilitazione dell'accesso all'app per i tecnici.
*   **Backend:** Aggiornato `functions/src/index.ts` per esportare la nuova funzione.
*   **Frontend:** Modificato `src/components/Tecnici/TecnicoRow.tsx` per sostituire la chiamata alla funzione fantasma con una chiamata sicura alla nuova `risorseUmane_gestisciAccessoTecnico`.
*   **Stato:** Completato.

**2. Riparazione `sendnotification`:**
*   **Analisi:** L'analisi del file `notifiche.md`, richiesta dall'utente, ha rivelato un'incongruenza architetturale nel piano iniziale. L'architettura corretta non prevede una Cloud Function per inviare notifiche, ma una scrittura diretta su Firestore dal client.
*   **Azione Correttiva:** Il piano è stato immediatamente adeguato. La Cloud Function `messaggistica-inviaNotifica.ts` (erroneamente creata) è stata eliminata.
*   **Frontend:** Modificato `src/components/Notifiche/InviaNotificaDialog.tsx`. La logica `httpsCallable` è stata rimossa e sostituita con una funzione locale (`inviaNotificaFirestore`) che crea un nuovo documento nella collezione `notifiche` di Firestore, impostando `isRead: false` come da specifica.
*   **Stato:** Completato e allineato all'architettura.

**3. Riparazione `manageusers`:**
*   **Backend:** Creata nuova Cloud Function `amministrazione_gestisciUtenti` in `functions/src/amministrazione-gestisciUtenti.ts` per la gestione sicura dei ruoli utente (es. promozione ad admin).
*   **Backend:** Aggiornato `functions/src/index.ts` per esportare la nuova funzione.
*   **Frontend (In Corso):** Identificato il componente `src/components/Settings/GestioneAmministratori.tsx` come punto in cui la vecchia logica (`manageUsers` e `forceAdmin`) viene invocata. L'intervento successivo consisterà nella modifica di questo file per utilizzare la nuova funzione `amministrazione_gestisciUtenti`.
*   **Stato:** Backend completato. Frontend in attesa di modifica.

