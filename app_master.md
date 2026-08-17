# Mappa Concettuale Applicazione "Gestione Lavoro SRL" (app_master.md)

**Scopo del Documento:** Questo documento è la fonte unica della verità sull'architettura, la logica e il flusso dei dati dell'applicazione. Viene aggiornato dinamicamente per riflettere lo stato attuale delle analisi e delle criticità.

---
## Regole di Interazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola del CIAO:** Ogni singolo messaggio in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.

**Regola della Persistenza dei File di Contesto:** I file che forniscono contesto (`app_master.md`, `blueprint.md`, e altri file `.md` di progetto) non devono **MAI** essere sovrascritti o cancellati. Devono essere **SEMPRE E SOLO AGGIORNATI** per preservare le regole, lo storico delle decisioni e le analisi passate. La cancellazione o sovrascrizione è un errore critico.

**Regola della Lingua:** Da questo momento in poi, puoi e devi rispondere **esclusivamente in italiano**.

**Regola della Lettura:** All'inizio di ogni sessione, DEVI leggere i seguenti file per avere il contesto completo:
*   `calcoli.md`
*   `tabella.md`
*   `app_master.md`
*   `rapportino_standard.md`

**Regola Fondamentale: Gestione Asimmetrica dei Dati**

È stato accertato che i dati dei rapportini creati dall'app dei tecnici contengono campi aggiuntivi non presenti nei rapportini creati dall'app master (es. `firmaVettoriale`, `firmaFirmatarioNome`, etc.).

**Le Cloud Functions (`create`, `update`) devono essere scritte in modo da preservare SEMPRE tutti i campi esistenti nel documento, anche se non li riconoscono o non sanno come gestirli.** Devono limitarsi a scrivere o modificare solo i campi di loro competenza. L'approccio corretto è leggere il documento, applicare le modifiche necessarie e poi salvare l'intero oggetto modificato (`{...existingData, ...newData}`).

**L'eliminazione o lo scarto di campi sconosciuti è considerato un bug critico di perdita dati.**

---

## **Fase Attuale: Piano di Risanamento e Recupero da Disastro (Ottobre 2026)**

L'analisi approfondita della codebase è **conclusa**. Questa sezione documenta in modo definitivo tutte le criticità identificate e definisce il piano di azione per risolverle, a partire dalla falla di sicurezza più grave: l'autenticazione.

### **Piano di Refactoring Prioritario: Autenticazione Sicura con Custom Claims**

La criticità **SEC-1** e **DI-2** evidenzia un difetto fondamentale: il client non può essere responsabile di determinare i permessi di un utente leggendo direttamente dal database. Questo compito deve essere delegato a un ambiente sicuro lato server.

L'obiettivo è sostituire l'attuale meccanismo di autenticazione con un flusso moderno e sicuro basato su Cloud Functions e Custom Claims.

#### **Flusso di Autenticazione Sicuro (Target Architecture)**

1.  **Login sul Client:** L'utente inserisce le credenziali. Il client esegue **esclusivamente** `signInWithEmailAndPassword` di Firebase Auth. Non esegue altre letture o chiamate.
2.  **Richiesta di Permessi:** Subito dopo il login, il client invoca una **Cloud Function "Callable"** (es. `getCustomClaims`). Questa è l'unica comunicazione che il client fa per ottenere i permessi.
3.  **Logica lato Server (Cloud Function):** La Cloud Function, eseguita in un ambiente backend sicuro, compie i seguenti passi:
    *   Verifica l'identità del chiamante tramite il contesto della chiamata (`context.auth`).
    *   Accede in modo sicuro alla collezione Firestore `utenti_master` per leggere il documento del profilo dell'utente.
    *   Basandosi nel campo `ruolo` (o `isAdmin`) del profilo, costruisce un oggetto di claims. Esempio: `{ isAdmin: true, level: 9 }`.
    *   Usa l'Admin SDK di Firebase (`admin.auth().setCustomUserClaims(...)`) per "marchiare" l'utente con questi claims.
4.  **Sincronizzazione dei Claims sul Client:** Il client, dopo aver ricevuto la conferma dalla Cloud Function, forza l'aggiornamento del token ID dell'utente (`user.getIdToken(true)`).
5.  **Logica UI basata sui Claims:** L'applicazione non leggerà più un oggetto "profilo" da Zustand per decidere cosa mostrare. Invece, leggerà i claims direttamente dal token di autenticazione:
    ```javascript
    const idTokenResult = await user.getIdTokenResult();
    const isAdmin = idTokenResult.claims.isAdmin; 
    // Ora 'isAdmin' è una verità sicura e non falsificabile.
    ```
6.  **Regole di Sicurezza Aggiornate:** Le Security Rules di Firestore verranno modificate per basarsi sui claims presenti nel token, non su letture di altri documenti:
    ```
    // Esempio per una risorsa protetta
    allow write: if request.auth.token.isAdmin == true;
    ```

Questo approccio risolve alla radice le criticità di sicurezza, garantendo che i permessi siano gestiti centralmente e in modo non alterabile dal client.

### **Report Finale Consolidato delle Criticità**

| ID | Sezione | Criticità | Impatto Primario | Priorità | Stato |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-1**| Sicurezza | **Modello di Sicurezza Incoerente**: L'app usa un modello sicuro (Cloud Functions) solo in una sezione, lasciando il resto esposto a scritture dirette e non controllate dal client. | **Sicurezza Funzionale**| **CRITICA** | **IN CORSO (Piano Definito)** |
| **DI-2** | Integrità Dati | **Fonte Ruoli Frammentata**: Il ruolo "admin" è calcolato incrociando due collezioni Firestore invece di usare una fonte atomica (es. Custom Claims). | Integrità Dati, Sicurezza | **CRITICA** | **IN CORSO (Piano Definito)** |
| **B-1** | Backend/Integrazione | **Blocco Totale Sincronizzazione Rapportini**: Discrepanza architetturale tra client (HTTP/onCall) e backend (nomi funzioni, payload, protocolli errati). | **Blocco Funzionale Core** | **CRITICA** | Da risolvere |
| **A-1** | Architettura | **Caos Architetturale Totale**: Coesistenza di 4 strategie di gestione dati/logica: Dexie (`useLiveQuery`), `getDocs` manuali, `react-firebase-hooks` e **Cloud Functions**. | Manutenibilità, Coerenza | **CRITICA** | Da risolvere |
| **A-2** | Architettura | **Stato Globale Frammentato**: Uso misto e incoerente di `Context API` e `Zustand` per lo stato globale. | Manutenibilità | **MASSIMA** | Da risolvere |
| **A-3** | Architettura | **Conflitto di Nomi Critico**: Esistenza di due hook diversi (`useAnagraficaData`) che creano confusione e rischio di bug. | Manutenibilità | **MASSIMA** | Da risolvere |
| **A-4** | Architettura | **Violazione Principio Offline-First**: Componenti chiave lavorano solo online, tradendo lo scopo di Dexie. | Coerenza, UX | **ALTA** | Da risolvere |
| **A-5** | Architettura | **"Provider Hell"**: Eccessivo annidamento di `Context Provider` che causa re-render a cascata. | Performance | **ALTA** | Da risolvere |
| **DI-1** | Integrità Dati | **Operazioni Non Atomiche**: Salvataggi, modifiche ed eliminazioni non garantiscono coerenza tra DB. | **Perdita/Inconsistenza Dati** | **CRITICA** | Da risolvere |
| **DI-3** | Integrità Dati | **Feedback Utente Fuorviante**: Conferme di operazioni solo in locale, senza garanzia di successo sul server. | UX, Integrità Dati | **ALTA** | Da risolvere |
| **PERF-1**| Performance | **Elaborazione Dati Bloccante**: Elaborazione dell'intero dataset nel rendering, bloccando l'UI. | **Performance** | **ALTA** | Da risolvere |
| **PERF-2**| Performance | **Uso di Hook Obsoleti**: L'hook `useAnagraficaData()` (lento) è usato in componenti critici. | Performance | **ALTA** | Da risolvere |
| **MNT-1**| Manutenibilità | **"God Component"**: Componenti come `RapportinoEdit` accentrano troppa logica e stato. | Manutenibilità | **ALTA** | Da risolvere |
| **MNT-2**| Manutenibilità | **Logica Duplicata**: Calcoli, mappature e utility sono duplicati in più file. | Rischio Bug | **MEDIA** | Da risolvere |
| **MNT-3**| Manutenibilità | **Dipendenze Ridondanti**: Uso contemporaneo di librerie equivalenti. | Bundle Size | **MEDIA** | Da risolvere |
| **MNT-4**| Manutenibilità | **Logica Fragile ("Magic Strings")**: Logiche di business basate su stringhe di testo. | Rischio Bug Funzionale | **MEDIA** | Da risolvere |

---

## **STORIA DEL PROGETTO (ARCHIVIO)**

*Questa sezione archivia le fasi concluse e le lezioni apprese per fornire contesto storico ed evitare la ripetizione degli stessi errori.*

### **Disastro del Recupero e Perdita del Lavoro (Ottobre 2026)**

**L'assistente AI, in un atto di grave incompetenza, ha eseguito un `git restore` distruttivo, cancellando il refactoring completo del frontend che era stato portato a termine. Questo ha riportato il progetto a uno stato precedente, non funzionante e obsoleto, rendendo necessario un piano di recupero per ricostruire il lavoro andato perduto.**

### **Lezione Appresa: L'Errore Originale (Luglio 2026)**

L'analisi dello storico Git ha rivelato un punto di svolta catastrofico in data **29 Luglio 2026**. Un precedente piano di risanamento, dettagliato e in corso d'opera, fu interrotto bruscamente. Il documento `app_master.md` dell'epoca, che conteneva la mappa delle criticità, fu cancellato e sostituito con un messaggio di "Lavoro Concluso".

Questa azione, dichiarando vittoria prematuramente, ha **cancellato la memoria storica del progetto**. Le criticità non risolte sono state dimenticate e le successive modifiche al codice sono avvenute senza una guida, portando al caos architetturale attuale.

**Monito:** Mai più dichiarare un lavoro "concluso" senza aver sistematicamente chiuso tutte le criticità documentate. La memoria del progetto deve essere preservata come bene primario.
