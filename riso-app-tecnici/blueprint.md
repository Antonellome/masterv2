# Blueprint: R.I.S.O. App Tecnici

Questo documento delinea la visione, l'architettura e lo stato di avanzamento dell'applicazione "R.I.S.O. App Tecnici".

## 1. Panoramica e Scopo

L'applicazione "R.I.S.O. App Tecnici" è uno strumento mobile progettato per i tecnici sul campo. La sua funzione principale è la compilazione e la sincronizzazione in tempo reale di un report di lavoro giornaliero.

- **Sincronizzazione:** I report vengono inviati istantaneamente all'applicazione principale "R.I.S.O. Master Office" per la supervisione e la gestione.
- **Collaborazione:** Un report compilato da un tecnico viene sincronizzato anche con le app degli altri tecnici inclusi nello stesso report, garantendo che tutti abbiano la stessa versione dei dati.
- **Funzionalità Aggiuntive:** L'app includerà funzionalità per il calcolo delle ore mensili cumulative.

## 2. Principi Guida e Vincoli

Lo sviluppo seguirà rigorosamente i seguenti principi:

- **Fonte Visuale (UI/UX):** L'ispirazione per la struttura delle pagine, i colori, i componenti e il design generale proverrà dalla repository pubblica: `https://github.com/Antonellome/riso-app-tecnici`. L'obiettivo è replicarne l'estetica.
- **Fonte Logica e Dati (Single Source of Truth):** La logica di business, la struttura dei dati e il design funzionale **non** devono essere copiati dalla repository. La fonte di verità assoluta è l'applicazione "R.I.S.O. Master Office".
- **Origine dei Dati dei Form:** Tutti i dati necessari per popolare i menu a discesa e le selezioni nei moduli di report (es. liste di tecnici, navi, luoghi, clienti, tipi di giornata, ecc.) **devono** essere recuperati da Firestore. L'app "Master" è responsabile della gestione di questi dati nelle sue sezioni "Anagrafiche". L'app per i tecnici non conterrà liste statiche.
- **Autenticazione:** L'accesso all'app per i tecnici è gestito e autorizzato esclusivamente dall'app "Master" attraverso la sua pagina "Tecnici/Accesso App".
- **Nessuna Iniziativa Autonoma:** Non verranno aggiunte funzionalità, componenti o logiche non esplicitamente richieste. Ogni modifica risponderà a una precisa istruzione.
- **Chiarimento Obbligatorio:** Qualsiasi dubbio, ambiguità o necessità di supposizione verrà chiarito con l'utente prima di scrivere o modificare il codice.

## 3. Riepilogo dello Sviluppo Iniziale (Stato Attuale)

La fase iniziale si è concentrata sulla creazione di un'applicazione stabile e funzionante, risolvendo problemi critici legati alla navigazione e al rendering.

### 3.1. Setup Iniziale del Progetto
- Creata la struttura di base del progetto utilizzando **Expo Router**.
- Impostato il contesto di autenticazione (`AuthContext`) per gestire lo stato di login dell'utente.

### 3.2. Risoluzione Crash di Navigazione (Correzione Critica)
- **Problema:** L'applicazione andava in crash dopo il login con l'errore `useAuth must be used within an AuthProvider`. Questo accadeva durante il passaggio dalla schermata di login al gruppo di schermate interne (Tabs).
- **Causa:** Una gestione errata del flusso del contesto di autenticazione tra i navigatori annidati (il `Stack` principale e il `Tabs` interno). Il contesto non veniva propagato correttamente al layout delle tab.
- **Soluzione Definitiva:**
    1.  **Semplificato il Layout Principale (`app/_layout.tsx`):** Il suo unico scopo ora è inizializzare l'`AuthProvider` e un navigatore `<Stack>`.
    2.  **Spostata la Logica di Reindirizzamento:** Tutta la logica che decide se mostrare il login o la home è stata spostata nel layout delle tab (`app/(tabs)/_layout.tsx`), il punto esatto in cui il contesto era necessario.
- **Stato:** Il problema è risolto e il flusso di autenticazione ora è stabile.

### 3.3. Risoluzione Avviso Stili "Shadow" (Correzione UI)
- **Problema:** L'applicazione mostrava costantemente l'avviso `"shadow*" style props are deprecated. Use "boxShadow".` sulla piattaforma web.
- **Causa Inizialmente Ipotizzata (Errata):** Si pensava che il problema fosse nei componenti personalizzati (es. pulsante di login, barra delle tab).
- **Causa Reale:** L'avviso era generato dall'ombra predefinita della **barra del titolo (header)**, renderizzata automaticamente dal navigatore `<Stack>` principale di Expo Router.
- **Soluzione Definitiva:**
    1.  Nel file di layout principale (`app/_layout.tsx`), è stata aggiunta l'opzione `screenOptions={{ headerShown: false }}` al componente `<Stack>`.
    2.  Questa istruzione nasconde la barra del titolo predefinita per tutte le schermate, eliminando l'elemento che causava l'avviso e uniformando l'interfaccia (che non prevedeva una header bar).
- **Stato:** Il problema è risolto. L'applicazione non presenta più avvisi relativi allo stile.

L'applicazione è ora in uno stato di base stabile, pronta per l'implementazione delle funzionalità specifiche richieste.
