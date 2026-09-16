# REGISTRO OPERATIVO DI BORDO

**Scopo:** Questo documento è l'unica fonte di verità del progetto. Contiene le regole operative, la mappa dell'applicazione, l'architettura dati e lo storico delle modifiche. La sua consultazione è obbligatoria prima di ogni intervento.

---

## ZONA 1: REGOLE OPERATIVE FONDAMENTALI (INVIOLABILI)

1.  **Regola del "CIAO":** Ogni singolo messaggio dell'AI in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.
2.  **Regola della Persistenza:** I file di contesto (`registro.md`, `blueprint.md`, etc.) non devono **MAI** essere sovrascritti o cancellati. Devono essere **SEMPRE E SOLO AGGIORNATI**.
3.  **Regola delle "Modifiche a Zone":** Lo sviluppo procede per sezioni isolate dell'app (le "zone"). Una zona deve essere completata e verificata prima di passare alla successiva. La sequenza è: **1. Anagrafiche**, **2. Reportistica**, e a seguire le altre.
4.  **Regola della Separazione Backend:** Esiste una separazione totale e invalicabile tra le Cloud Functions dell'App Tecnici e quelle dell'App Master.
    *   Le funzioni dell'App Tecnici sono **INTOCCABILI**.
    *   Tutte le funzioni per l'App Master **DEVONO** avere il prefisso `master_` nel nome (es. `master_gestisciAnagrafica`).
5.  **Regola del "Nessun Dubbio":** L'AI ha l'obbligo di fermarsi e porre domande dirette per risolvere qualsiasi dubbio su logiche, flussi o utilizzo dell'applicazione. Sono vietate le assunzioni.
6.  **Principio di "Non Alterazione della Logica Esistente":** Quando si integra una nuova funzionalità backend, l'intervento sul frontend deve essere **puramente additivo**. È severamente vietato alterare la logica di business pre-esistente dell'app.

---

## ZONA 2: MAPPA APPLICAZIONE MASTER E LOGICA DI DOMINIO

### Mappa delle Pagine

*   **/login, /signup:** Pagine di autenticazione.
*   **/ o /dashboard:** `DashboardPage`. Pagina principale con visione d'insieme.
*   **/anagrafiche/*:** `AnagrafichePage`. Componente che orchestra il CRUD per tutti i dati master.
*   **/rapportini:** `RapportiniList`. Lista di tutti i rapportini di lavoro.
*   **/rapportino/edit/:id, /rapportino/edit/new:** `RapportinoEdit`. Form per la creazione e modifica di un rapportino.
*   **/tecnici:** `TecniciPage`. Gestione dell'anagrafica dei tecnici.
*   **/scadenze:** `ScadenzePage`. Gestione di scadenze documentali.
*   **/documenti:** `DocumentiPage`. Gestione documentale generica.
*   **/presenze:** `PresenzePage`. Monitoraggio delle presenze (check-in).
*   **/reportistica:** `ReportisticaPage`. Sezione per report avanzati e filtri complessi.
*   **/notifications:** `NotificationsPage`. Centro notifiche interno all'app.
*   **/settings:** `SettingsPage`. Impostazioni generali e gestione degli utenti amministratori.

### Logica di Dominio e Relazioni

*   **Relazioni tra Anagrafiche:** L'applicazione ha una logica relazionale precisa. Le entità non vengono create isolate. Esempio: si crea un `Cliente` e, separatamente, si crea una `Nave` o un `Luogo` che viene poi **associato** a quel cliente. La creazione di un record figlio (Nave) aggiorna la relazione, non il contrario. La configurazione di queste relazioni è definita nel file `anagrafiche.config.ts`.
*   **Definizione `categorie`:** La collezione `categorie` si riferisce **esclusivamente** alle specializzazioni e qualifiche dei tecnici (es. "elettricista", "meccanico"), **non** a categorie di lavori o rapportini.
*   **Separazione Ruoli (Tecnici vs. Amministratori):**
    *   **Tecnici:** Hanno accesso **solo** all'App Tecnici. La loro anagrafica e le credenziali di accesso (es. password) per l'app mobile vengono create e gestite dall'App Master, nella pagina `/tecnici`.
    *   **Amministratori:** Hanno accesso **solo** all'App Master. Non sono tecnici e la loro gestione (es. promozione di un utente a ruolo di admin) avviene in un'area separata, probabilmente in `/settings`.

---

## ZONA 3: ARCHITETTURA DATI E STRATEGIA DI SINCRONIZZAZIONE (LOCAL-FIRST)

L'architettura dell'App Master è **Local-First**.

#### **Logica di LETTURA (100% Locale)**
1.  **Sincronizzazione Iniziale/Incrementale:** All'avvio, l'app scarica i dati da Firestore e li popola nel database locale **Dexie.js**.
2.  **Operatività Offline:** L'applicazione opera **esclusivamente su Dexie.js**. Ogni pagina, lista o filtro legge i dati da lì, azzerando il consumo di letture da Firestore durante la navigazione.

#### **Logica di SCRITTURA (Coda Garantita)**
1.  **Azione Utente:** L'utente esegue un'operazione di C/U/D.
2.  **Salvataggio Locale Immediato (Optimistic UI):** La modifica viene salvata **immediatamente** su Dexie.js.
3.  **Messa in Coda per il Cloud:** L'operazione viene messa in una coda persistente per essere inviata a una Cloud Function `master_*` dedicata, garantendo la consegna anche in caso di disconnessione.

---

## ZONA 4: SPECIFICHE APP TECNICI (RIFERIMENTO DATI)

Questa sezione descrive la struttura dei dati generati dall'App Tecnici, estratti da `app_tecnici_info.md`.

#### **Struttura Dati Rapportini (`rapportini`)**
```json
{
  "id": "<ID>",
  "data": "2023-10-27",
  "presenze": ["<UID_TECNICO_1>"],
  "lavoroEseguito": "Descrizione...",
  "isDeleted": false,
  "tecnicoScriventeId": "<UID>"
}
```
*   **Logica di Eliminazione:** Impostare `isDeleted: true`.

#### **Struttura Dati Check-in (`checkin_giornalieri`)**
```json
{
  "id": "<ID_AUTO_GENERATO>",
  "tecnicoId": "<UID_DEL_TECNICO>",
  "timestamp": "<TIMESTAMP_SCELTO_DA_UTENTE>",
  "tipo": "start",
  "posizione": { "latitude": 45.123, "longitude": 9.456 },
  "timestampReale": "<TIMESTAMP_DEL_SERVER>"
}
```
*   **Logica di Creazione:** L'App Tecnici usa la Cloud Function `createCheckin` che aggiunge automaticamente `tecnicoId` e `timestampReale`.

#### **Invio Notifiche PUSH ai Tecnici**
Per inviare una notifica PUSH, l'App Master deve recuperare il token FCM del tecnico e usare una funzione `master_*` con l'Admin SDK per inviare il messaggio.

---

## ZONA 5: DIARIO DEI LAVORI

*   **24/07/2024:**
    *   **Attività:** Deploy della Cloud Function `master_gestisciAnagrafica`.
    *   **Descrizione:** Il deploy è andato a buon fine dopo un complesso troubleshooting del backend condiviso, che ha richiesto la correzione di un errore di inizializzazione nel file `functions/src/notifiche.ts` e la forzatura della ricompilazione del backend (`npm run build`).
    *   **Risultato:** La funzione `master_gestisciAnagrafica` è stata deployata. Il backend è stato reso più stabile.

*   **24/07/2024:**
    *   **Attività:** Definizione Regole e Architettura.
    *   **Descrizione:** A seguito di gravi errori, sono state ri-stabilite e documentate le Regole Operative Fondamentali e l'architettura Local-First. Questo registro è il risultato di questa ricostruzione totale.
