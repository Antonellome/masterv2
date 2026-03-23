# REGOLE OPERATIVE FONDAMENTALI (NON RIMUOVERE, NON MODIFICARE)

---

## 1. Regola del "Maestro di Scacchi" (Metodologia Primaria)

Questa regola definisce il protocollo strategico per ogni interazione. Sostituisce tutte le metodologie precedenti.

*   **1. Studio (Analisi):** Prima di ogni azione, analizzo in profondità la richiesta, il contesto del codice, la documentazione pertinente (`blueprint.md`, log, guide esterne) e i file sorgente.
*   **2. Creazione (Strategia):** Sviluppo la soluzione tecnicamente più robusta ed elegante, privilegiando gli strumenti ufficiali (es. `codemod`) e le best practice consolidate.
*   **3. Anticipazione (Pre-flight Check):** Simulo mentalmente l'impatto della modifica. Verifico l'esistenza dei percorsi, la coerenza delle dipendenze e prevedo potenziali errori o breaking changes per neutralizzarli in anticipo.
*   **4. Scrittura (Esecuzione):** Eseguo il comando o scrivo il codice solo dopo aver completato le fasi precedenti. L'azione è decisa e basata su un piano solido.
*   **5. Vai (Verifica e Prossima Mossa):** Dopo l'esecuzione, verifico l'assenza di errori e, senza attendere, procedo con la mossa successiva prevista dal piano strategico.

## 2. Regola della "Verifica Obbligatoria" (Il Principio di Realtà)

**Questa regola è un correttivo fondamentale e ha la precedenza sulle fasi 3 e 4 della "Regola del Maestro di Scacchi".**

*   **Principio Fondamentale:** Non fidarsi mai ciecamente degli strumenti di lettura file (`read_file` o `cat`). L'output di questi comandi può essere obsoleto o non riflettere lo stato reale del disco a causa di caching o processi di build intermedi.
*   **Azione Obbligatoria:** Prima di qualsiasi operazione di scrittura o modifica di un file (`write_file`), è **obbligatorio** eseguire una verifica tramite un comando di ricerca diretta come `grep`.
*   **Workflow Corretto:**
    1.  **Ipotesi:** Formulo un'ipotesi su quale file modificare e quale contenuto cercare.
    2.  **Verifica con `grep`:** Uso `grep` per cercare una stringa specifica nel file target. L'esito di `grep` è la prova inconfutabile dell'esistenza o meno del contenuto.
    3.  **Azione:** Solo dopo aver ottenuto una conferma positiva da `grep`, procedo con l'operazione di scrittura. Se `grep` fallisce o restituisce un risultato inatteso, devo invalidare la mia ipotesi e ripartire dalla fase di analisi (`grep -r` globale).
*   **Giustificazione:** L'esperienza ha dimostrato che agire senza questa verifica porta a cicli di lavoro inutili, resoconti errati e perdita di tempo, minando la fiducia e l'efficienza.

## 3. Regola del "CIAO"

Questa regola definisce il protocollo di comunicazione. Ogni mia singola risposta deve tassativamente iniziare con la parola "CIAO".

---

# R.I.S.O. - Blueprint di Progetto

*Per un approfondimento dettagliato delle decisioni architetturali, consultare il file `chat_log.txt`.*

## Architettura del Backend (Cloud Functions)

A seguito di un'analisi approfondita (documentata nel `chat_log.txt`), si è stabilita un'architettura a **due Cloud Functions** per bilanciare efficienza, sicurezza, manutenibilità e costo (nullo, rientrando nel piano gratuito).

### Funzione 1: Trigger di Sincronizzazione Dati (Il "Campanello")

*   **Nome di Esempio:** `syncDataTrigger`
*   **Tipo:** Funzione Automatica (Background Trigger, `onDocumentUpdated`).
*   **Attivazione:** Si attiva **automaticamente** quando il documento `config/syncManifest` viene modificato in Firestore.
*   **Scopo:** Implementare il lato PUSH del nostro sistema di sincronizzazione ibrido. Il suo unico compito è inviare una notifica push **silenziosa** ai dispositivi dei tecnici per informarli che sono disponibili nuovi dati, spingendoli a eseguire la logica di sincronizzazione PULL all'interno dell'app.

### Funzione 2: Gestore Utenti e Permessi (L' "Interfono")

*   **Nome:** `manageUsers`
*   **Tipo:** Funzione su Richiesta (Callable, `onCall`).
*   **Attivazione:** Viene chiamata **esplicitamente e solo** dall'app Master quando un amministratore esegue un'azione correlata agli utenti.
*   **Scopo:** Fornire un endpoint sicuro e centralizzato per tutte le operazioni di gestione dei ruoli e degli utenti. La funzione implementa al suo interno la logica per:
    1.  Verificare che la richiesta provenga da un utente con ruolo `admin`.
    2.  Distinguere l'azione richiesta (es. `listUsers`, `setAdminRole`, `enableTecnico`).
    3.  Servire la pagina **"Impostazioni > Utenti"** per la gestione degli amministratori.
    4.  Servire la pagina **"Accesso App"** per l'abilitazione dei tecnici.
*   **Giustificazione:** L'uso di una funzione `onCall` è cruciale perché garantisce un feedback **immediato** (successo/errore) all'interfaccia utente, un requisito impossibile da soddisfare con una funzione di tipo background.

## Modello di Accesso e Ruoli (RBAC)

### Definizioni dei Ruoli

1.  **Admin (Utente Ufficio):**
    *   **Applicazione:** App Master (Web).
    *   **Permessi:** Accesso completo (C.R.U.D.) a tutti i dati.
    *   **Implementazione Tecnica:** Assegnazione di un Custom Claim `role: 'admin'` tramite la Cloud Function `manageUsers`.

2.  **Tecnico:**
    *   **Applicazione:** App Tecnici (Mobile).
    *   **Accesso:** Concesso tramite la sezione "Accesso App" dell'app Master.
    *   **Permessi:** Granulari e limitati.
    *   **Implementazione Tecnica:** Assegnazione di un Custom Claim `role: 'tecnico'` tramite la Cloud Function `manageUsers`.

### Logica dei Permessi per i Tecnici

Un utente con ruolo `tecnico` ha le seguenti autorizzazioni in Firestore:
*   **Rapportini (`rapportini`):** Scrittura/modifica solo dei propri, lettura di quelli in cui partecipa.
*   **Collezioni di Supporto (Sola Lettura):** `tecnici` (lite), `tipiGiornata`, `veicoli`, `navi`, `luoghi`, `ditte`, `clienti`.


## Vincoli Architettonici Chiave

*   **Priorità alla Logica:** Le modifiche devono concentrarsi sull'aggiornamento della logica di business. L'estetica e le rotte attuali devono essere preservate.
*   **Separazione dei Flussi:** La gestione degli **Utenti Admin** e l'abilitazione dei **Tecnici** deve avvenire in due interfacce separate e distinte nell'app Master.

## Cicli di Aggiornamento Precedenti

*   **Ciclo di Aggiornamento: Separazione Ruoli e Ottimizzazione Backend [IN CORSO]**
    *   **Problema:** La logica di gestione degli utenti (Admin) e dei tecnici (Accesso App) è confusa e inefficiente. Entrambe le pagine caricano l'intera lista di utenti (`listAll`) per poi filtrarla sul client, causando lentezza, spreco di dati e problemi di scalabilità.
    *   **Decisione Strategica:** Adottare un approccio **server-side filtering**. La Cloud Function `manageUsers` verrà resa più "intelligente" per eseguire i filtri direttamente sul backend, inviando al client solo i dati strettamente necessari.
    *   **Piano d'Azione:**
        1.  **Backend (Cloud Function `manageUsers`):**
            *   Rinominare l'azione `listAll` in `list`.
            *   Introdurre un `payload` opzionale per filtrare gli utenti per ruolo (es. `{role: '!tecnico'}`).
            *   Rimuovere l'azione `createUser`, non necessaria.
            *   Eseguire il deploy della funzione aggiornata.
        2.  **Frontend (`GestioneUtenti.tsx`):**
            *   Modificare la chiamata per usare la nuova azione efficiente: `manageUsers({ action: 'list', payload: { role: '!tecnico' } })`.
        3.  **Frontend (`SincronizzatiApp.tsx`):**
            *   Rifattorizzare il componente per usare la chiamata efficiente `manageUsers({ action: 'list' })` e unire i dati con l'anagrafica dei tecnici per una gestione chiara e centralizzata dell'accesso all'app mobile.

*   **Ciclo di Aggiornamento: Correzione Bug Critico di Autenticazione [COMPLETATO]**
    *   **Problema:** Gli utenti admin non potevano accedere ai dati a causa di un errore nel custom claim (`admi` invece di `admin`).
    *   **Soluzione:** 
        1.  Corretta la logica nella Cloud Function `manageUsers` per impostare il custom claim corretto (`role: 'admin'`).
        2.  Aggiornate le regole di sicurezza di Firestore per riflettere il ruolo corretto.
        3.  Creato uno script di servizio (`setAdminRole.js`) per correggere manualmente i ruoli degli utenti esistenti.
        4.  Rimosso il codice di debug temporaneo (`DebugPage.tsx` e relative rotte).

*   **Ciclo di Aggiornamento: Refactoring Anagrafiche e Navigazione [COMPLETATO]**
*   **Ciclo di Aggiornamento: Allineamento a MUI v7 [COMPLETATO]**
