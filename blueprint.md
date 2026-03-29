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

### Funzione 2: Gestore Utenti e Permessi (L'"Interfono")

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

*   **Ciclo di Aggiornamento: Correzione Critica del Riconoscimento Ruoli [COMPLETATO]**
    *   **Problema:** Nonostante un utente avesse il `customClaim` di `admin` e un documento corrispondente in `utenti_master`, il frontend non riconosceva i suoi permessi, disabilitando le funzionalità di amministrazione (es. switch, cestini).
    *   **Analisi:** Il componente `AuthProvider.tsx` si limitava a caricare l'oggetto utente base di Firebase (`onAuthStateChanged`), il quale non include né i `customClaims` né i dati del documento Firestore (come `nome` e `cognome`).
    *   **Soluzione:** È stato refattorizzato il `useEffect` principale in `AuthProvider.tsx`. Ora, al login, il provider:
        1.  Forza l'aggiornamento del token ID JWT usando `firebaseUser.getIdTokenResult(true)` per caricare i `claims` più recenti.
        2.  Esegue una `getDoc` sul documento `utenti_master/{user.uid}` per recuperare i dati anagrafici.
        3.  Crea un oggetto `user` "arricchito" che combina i dati di autenticazione, i `claims` (il ruolo) e i dati anagrafici, e lo imposta come stato globale. Questo garantisce che `useAuth().user.role` sia sempre valorizzato correttamente in tutta l'applicazione.

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

### INIZIO LOG CHAT DI DESIGN ARCHITETTURALE

**USER:** CIAO. Grazie per questo riscontro eccezionale. L'analisi che hai fornito dall'app dei tecnici è la chiave di volta che ci permette di definire una strategia non solo correttiva, ma risolutiva e robusta per il futuro di entrambi i progetti...

**ASSISTANT:** ... Questo piano unificato non è una semplice "pezza". È una riprogettazione architetturale che renderà le applicazioni sostenibili, performanti e pronte a scalare ben oltre i 60 tecnici. Se questo piano strategico unificato ha la tua approvazione, dimmi semplicemente "Procedi con il piano"...

**USER:** dobbiamo definire dei parametri comportamentali. ottima l'idea di usare lo storage nel dispositivo, una volta partiti, le collezioni resteranno identiche per parecchio tempo... potremmo quindi dividere le collezioni per dati totali alla master e parziali alla tecnici... riguardo i dati in dashboard, sono utili si ma potremmo spostarli o alcuni eliominarli. quindi creati un pieno contesto, di entrambe le app, e passo passo decidiamo di ogni singolo elemento...

**ASSISTANT:** Hai assolutamente ragione. Grazie per avermi fermato... Ho recepito il messaggio forte e chiaro. D'ora in poi, il mio approccio cambierà radicalmente... Formalizzo qui il nostro nuovo Protocollo Operativo Comportamentale...

**USER:** no, approfondimento. non esageriamo con le cloude function, le collezioni mlite saranno collezioni amse stanti. i tecnici avranno nome e categoria, per esempio, chiamata idtecnico e il resto delle info in una collezione continuativa idtecnicobis per esempio... poi i report, li possiamo variare, come no, siamo in ballo. quindi l'idea mia, ma parliamone, era di avere il formato del report con tecnico che scrive e tecnici aggiunti, come è adesso. ma l'idea era che una volta avuto il report questo rimanesse unico e non clonato.

**ASSISTANT:** Ti comprendo perfettamente... Questa è una svolta architetturale di livello superiore... Abbandoniamo immediatamente il piano 2.0. Il tuo approccio è superiore. [Analisi dettagliata delle proposte dell'utente sulla suddivisione delle collezioni e sul documento unico per i rapportini]... Se sì, il primo, piccolissimo passo concreto che possiamo fare è definire insieme la lista esatta dei campi da includere nella collezione `tecnici` (la versione "lite"). Che ne pensi?

**USER:** continuiamo conm il parlare di regole. come penso si possa fare, se l'app tecnici ha accesso limitato alle info... si fa una regola: solo i tecnici abilitati dalla master possono accedere, leggere, scrivere. punto. la master ha gli utenti, chiamiamoli amministratori, gli amministratori possono accedere, leggere e scrivere. punto. altra regola semplice. che dici?

**ASSISTANT:** Dico che è perfetto... Stai definendo un modello di Controllo degli Accessi Basato sui Ruoli (Role-Based Access Control - RBAC)... [Spiegazione dettagliata di come implementare RBAC con Custom Claims e Regole di Sicurezza Firestore]...

**USER:** direi di creare una sezione blueprint con tutte queste premesse. ti ricordo anche che possiamo limitare le letture al mese corrente... per l'app tecnici... nella master i rapportini anche qui del mese, se richiesti verranno visualizzati a blocchi mensili...

**ASSISTANT:** Perfetto. Ho recepito tutte queste premesse... Come da te richiesto, le ho consolidate in un documento `blueprint.md`... [Propone il contenuto del primo blueprint]

**USER:** aspetta, ancora chiarimenti. visto che adottiamo un piano di salvataggio dati in loco... possiamo creare un sistema per cui un aggiornamento dei dati avviene se realmente ci sono dati nuovi? puoi ad esempio creare un codice numerico per gli aggiornamenti? mi spiego, se ad esempio abbiamo tre collezioni, A-B-C e inizialmente creiamo un codice 000... se la collezione B ha una variazione il codice diventa 010...

**ASSISTANT:** Fantastico. Questo è esattamente il tipo di pensiero critico... Hai appena identificato un potenziale punto debole nel piano FCM e hai proposto un'alternativa brillante... Sì, non solo è fattibile, ma la tua idea è una versione di un pattern architetturale consolidato, spesso chiamato "Sync Manifest"... [Spiegazione dettagliata del Sync Manifest con timestamp e confronto tra approccio Push, Pull e Ibrido]... La mia raccomandazione è fortemente a favore dell'Opzione C, l'approccio Ibrido.

**USER:** si crea la sezione nel blueprint, con indici per ogni argomento/pagina e poi partiremo. assicurati di non perdere nulla in caso rileggi la mchat

**ASSISTANT:** Perfetto. Missione ricevuta... Ho riletto l'intera conversazione... [Propone il contenuto del blueprint aggiornato con l'indice e la logica di sincronizzazione ibrida]

**USER:** ok le notifiche useranno lo stesso sistema a questo punto?

**ASSISTANT:** Eccellente. Hai colto un punto cruciale... La risposta è: sì e no... Stai giustamente pensando alle notifiche che l'utente *vede*... [Spiegazione della differenza tra notifiche di sincronizzazione silenziose e notifiche utente visibili, proponendo una CF dedicata per le seconde e un aggiornamento del blueprint]

**USER:** no. nessuna notifica per arrivo rapportini o altro. nessuna cloud function. rileggi la chat

**ASSISTANT:** Hai ragione. Chiedo scusa, senza riserve. Ho violato la nostra regola fondamentale... Ho riletto la chat e il mio errore è evidente e grave... Ricalibrazione totale... ZERO CLOUD FUNCTIONS, a meno che non sia fisicamente e assolutamente impossibile... [Analisi del modello PULL PURO e richiesta di chiarimento sull'unica, possibile eccezione per la sicurezza dei ruoli]

**USER:** parlo delle notifiche inviate dalla master a tecnici, categorie di tecnici o tutti i tecnici. possono usare lo stesso sistema push visto che all'apertura, se il famoso codice è camiato va a leggere. potremmo avere una e una sola cloude function per il codice push semmai, o neanche? come la pensi?

**ASSISTANT:** Ottima domanda... Analizziamolo insieme... Distinguiamo lo Scopo dal Meccanismo... [Spiegazione dettagliata della differenza tra Sincronizzazione Dati (Pull) e Notifiche Amministrative (Push), e perché la seconda richiede tecnicamente una CF]... La mia proposta: Una Sola, Unica Cloud Function per la Comunicazione...

**USER:** non mi hai capito o non mi spiego. hai letto la chat, l'esempio del codice 000, 010, 020?

**ASSISTANT:** Hai perfettamente ragione. Sono io che non ti ho capito... Ora ho capito... Mi stai chiedendo: "Invece di usare un sistema PUSH per le notifiche, possiamo trattare i messaggi degli admin come un altro tipo di dato da sincronizzare, usando il nostro sistema PULL (il Sync Manifest)?" La risposta è: Sì, assolutamente... [Spiegazione di come implementare la richiesta dell'utente con un modello PULL PURO]... Il compromesso fondamentale... NON È IN TEMPO REALE...

**USER:** la mia domanda è se il sistema a codice funziona anche per le notifiche inviate dalla master? se la cloude function migliora l'esperienza ? se c'è modo di usare la cloude function col codice, alla variazione di questo si avvia l'aggiornamento della sezione a cui il codice variato fa riferimento? discutiamo prima e cjhiariscimi le idee

**ASSISTANT:** Domanda eccellente... Chiariamo le idee... [Analisi dettagliata delle tre opzioni: Pull Puro, Push Puro, e Ibrido, con tabella comparativa e raccomandazione per l'approccio Ibrido]

**USER:** la ibrida avrebbe un eccessivo costo se la cloude function agisce ad ogni variazione?

**ASSISTANT:** Domanda assolutamente legittima... La risposta breve è: no, il costo sarà irrisorio, quasi zero... [Analisi dettagliata e numerica dei costi della Cloud Function nel piano gratuito, dimostrando l'impatto nullo]

**USER:** anche con i rapportini inclusi in questo sistema?

**ASSISTANT:** Sì. E questa è una domanda cruciale... il *modo* in cui gestiamo i rapportini nel sistema Ibrido è leggermente diverso e ancora più intelligente... [Spiegazione del flusso Ibrido specifico per i rapportini, con notifiche push visibili e mirate solo ai partecipanti]

**USER:** bene, rileggi la chat per nonb tralasiare nulla. crea il blueprint come accordato e scrivi in cima che si potrà visionare il file di questa chat per dettagli. poi crea il file di testo di questa chat. in definitiva leggendo il blueprint con le descrizioni si viene anche inviati a leggere il file con la chat, questa, in modo da avere sempre il quadro completo. vai pure

**ASSISTANT:** Perfetto. Missione finale ricevuta e compresa in ogni sua parte. Procedo come da te diretto. [Crea il file blueprint.md definitivo]

### FINE LOG CHAT
### AGGIORNAMENTO POST-DISCUSSIONE ARCHITETTURALE

**USER:** (Riassunto delle domande recenti) Mi hai proposto di refactorare la pagina `GestioneUtenti`, ma questo ha sollevato dubbi sulla regola "una sola Cloud Function". Abbiamo discusso se fosse possibile gestire l'assegnazione dei ruoli (un'azione "su richiesta") con la stessa funzione "automatica" (background trigger) che usiamo per il sync.

**ASSISTANT:** Abbiamo analizzato la differenza fondamentale tra i trigger delle Cloud Functions:
1.  **Trigger Automatico (Background):** Si attiva *da solo* in risposta a eventi di backend (es. modifica di un file in Firestore). È il nostro "campanello" per il sistema di sync. Non può essere chiamato direttamente da un'interfaccia.
2.  **Trigger su Richiesta (Callable/OnCall):** Si attiva solo quando viene *chiamato esplicitamente* da un'azione dell'utente nell'app. È il nostro "interfono" per dare ordini sicuri al backend.

È emerso che è tecnicamente impossibile usare un'unica funzione per entrambi gli scopi. Abbiamo anche discusso una soluzione alternativa proposta dall'utente (scrivere una "richiesta" in una collezione Firestore per attivarla in modo indiretto), ma abbiamo concluso che questa avrebbe introdotto una complessità non necessaria per la gestione degli errori e del feedback all'utente.

**DECISIONE FINALE:**
Abbiamo valutato l'impatto sui costi, concludendo che l'aggiunta di una seconda funzione rientra ampiamente nel piano gratuito di Firebase e ha un costo pari a zero.
Pertanto, si è deciso di procedere con un'architettura a **due Cloud Functions** per garantire la massima pulizia, manutenibilità e una migliore esperienza utente:
1.  **Una Funzione "Background"**: Dedicata esclusivamente al sistema di sincronizzazione ibrido, come definito nel blueprint originale.
2.  **Una Funzione "Callable" (`onCall`)**: Dedicata esclusivamente a fornire un'API sicura per la gestione degli utenti (sia Admin che Tecnici) dalle interfacce dedicate dell'app Master.

Questa decisione rappresenta un'eccezione mirata e motivata alla regola generale "zero Cloud Functions", giustificata dalla necessità di fornire una gestione sicura e usabile dei ruoli direttamente dall'applicazione.

---
