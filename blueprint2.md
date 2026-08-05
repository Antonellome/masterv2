# Blueprint V2: Piano di Trapianto e Risanamento Completo

**Scopo del Documento:** Questo documento è la mappa strategica e operativa per la messa in sicurezza, il ripristino e il risanamento totale dell'applicazione "Gestione Lavoro SRL". Segue le criticità identificate in `app_master.md` e definisce la via d'uscita dal debito tecnico.

---

## Regole di Interazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola del CIAO:** Ogni messaggio in questa chat DEVE iniziare con la parola "CIAO".

---

## **FASE 1: Configurazione del Cantiere e Trapianto dei Dati**

**Obiettivo:** Creare una replica 1:1 dell'ambiente di produzione in un ambiente di sviluppo isolato e sicuro, utilizzando il nuovo workspace e il progetto Firebase `riso-dev-workspace`.

### **Passo 1.1: Il Trapianto delle Credenziali**
L'operazione più critica. Dobbiamo "staccare" l'applicazione in questo nuovo workspace dal puntamento al database di produzione e collegarla al nostro cantiere vuoto.

1.  **Azione (Eseguita da me):** Leggerò il file di configurazione Firebase attuale (es. `src/firebase.js` o simile).
2.  **Azione (Eseguita da me):** Lo modificherò in modo **permanente**, sostituendo le credenziali di produzione con quelle del nostro cantiere `riso-dev-workspace` che abbiamo già salvato. Questo garantirà che questo workspace parli **esclusivamente** con il database di sviluppo.

### **Passo 1.2: Il Ripristino dei Dati di Produzione**
Ora che l'app punta al database vuoto, lo popoleremo con i dati di produzione che hai messo al sicuro.

1.  **Azione (Eseguita da te):** Avvierai l'applicazione in questo workspace.
2.  **Azione (Eseguita da te):** Andrai nella sezione "Impostazioni > Backup e Ripristino".
3.  **Azione (Eseguita da te):** Utilizzerai la funzione **"Ripristina da Backup"**, selezionando il file `backup_database_completo_...json` che hai scaricato.
4.  **Risultato Atteso:** L'operazione caricherà l'intero dataset nel database `riso-dev-workspace`. Potrebbe richiedere qualche minuto.

### **Passo 1.3: Verifica e Convalida**
Dobbiamo essere certi al 100% che l'operazione sia riuscita.

1.  **Azione (Eseguita da te):** Navigherai nell'applicazione per verificare che tutti i dati (rapportini, utenti, anagrafiche) siano presenti e corretti.
2.  **Azione (Eseguita da me):** Eseguirò delle query dirette sul database `riso-dev-workspace` per confermare programmaticamente che i dati corrispondano al backup.

**Al termine della Fase 1, avremo un clone perfetto, isolato e funzionante dell'app, pronto per essere smontato e ricostruito in sicurezza.**

---

## **FASE 2: Piano di Risanamento del Debito Tecnico**

**Obiettivo:** Ristrutturare l'architettura dell'applicazione per renderla sicura, performante e manutenibile, risolvendo sistematicamente le criticità di `app_master.md`.

**Principio Guida: Architettura a Funzioni Centralizzate (Backend-for-Frontend)**
TUTTE le operazioni di scrittura, modifica e cancellazione devono passare attraverso un unico punto di controllo sicuro: le **Cloud Functions**. Il client non deve MAI scrivere direttamente nel database.

### **2.1: Blindatura della Sicurezza e Integrità (Criticità SEC-1, DI-1, DI-2)**
1.  **Definizione dell'API di Funzioni:** Creeremo un file (`functions_api.md`) che definisce la "lingua" tra il client e il server. Per ogni operazione (es. `creaRapportino`, `modificaCliente`), definiremo input e output attesi.
2.  **Sviluppo delle Cloud Functions:** Implementeremo le funzioni definite, assicurandoci che ogni operazione sia **atomica** e contenga la logica di validazione.
3.  **Implementazione dei Custom Claims:** Creeremo una Cloud Function (`setUserRole`) per gestire i ruoli (es. 'admin'). L'app leggerà i ruoli in modo sicuro dal token di autenticazione, eliminando la necessità di interrogare le collezioni `admins` e `utenti_master`.
4.  **Lockdown del Database:** Aggiorneremo le `firestore.rules` per **negare tutte le scritture dirette dal client**. Sarà consentita solo la lettura.

### **2.2: Unificazione dell'Architettura (Criticità A-1, A-2, A-3, A-5)**
1.  **Adozione di Zustand come Unico Store Globale:** Rimuoveremo completamente la `Context API`. Tutto lo stato globale (utente, anagrafiche, ecc.) verrà gestito tramite un unico store `Zustand`.
2.  **Sostituzione delle Chiamate Dirette:** Rimuoveremo `react-firebase-hooks` e tutti gli usi di `getDocs`, `updateDoc`, `setDoc` dal client. Le letture verranno fatte tramite uno snapshot listener centralizzato che popola lo store Zustand. Le scritture useranno **esclusivamente** le Cloud Functions definite al punto 2.1.
3.  **Risoluzione del Conflitto `useAnagraficaData`:** Elimineremo entrambi gli hook esistenti e ne creeremo uno nuovo, unico e performante (`useStoreData`), che leggerà i dati direttamente e in modo reattivo dallo store Zustand.

### **2.3: Ottimizzazione delle Performance e UX (Criticità PERF-1, PERF-2, DI-3, A-4)**
1.  **Elaborazione Dati sul Server:** I calcoli complessi (es. totali, statistiche) verranno spostati dal client alle Cloud Functions. Il client riceverà i dati già pronti per essere visualizzati.
2.  **Feedback Utente Affidabile:** I messaggi di successo/errore all'utente verranno mostrati solo **dopo** aver ricevuto una risposta affermativa dalla Cloud Function, garantendo che l'operazione sia andata a buon fine sul server.
3.  **Rafforzamento dell'Offline-First con Dexie:** Dexie (il database locale) verrà utilizzato come **cache di sola lettura** dei dati provenienti da Firestore. Le operazioni di scrittura verranno messe in una coda (queue) che tenterà di chiamare la Cloud Function appropriata. Questo garantirà che l'app sia consultabile offline e che le modifiche vengano sincronizzate in modo sicuro non appena si torna online.

---

## **FASE 3: Sviluppo Iterativo e Consegna**

Una volta completato il risanamento nel cantiere, l'applicazione sarà pronta per essere promossa a sostituire quella vecchia, con la certezza di avere una base solida, sicura e proiettata al futuro.
