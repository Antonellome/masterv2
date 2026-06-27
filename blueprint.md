# Blueprint di Sviluppo - R.I.S.O. App

Questo documento serve come unica fonte di verità per lo sviluppo e la manutenzione dell'applicazione. Traccia lo stato attuale, i problemi noti e il piano di azione dettagliato per le modifiche future.

---

## 1. Stato Attuale e Contesto

L'applicazione è un'interfaccia di amministrazione complessa per la gestione di tecnici, rapportini, clienti e altro. Utilizza una stack moderna basata su React, Vite, TypeScript, Material-UI e Firebase.

### Problema Bloccante Rilevato:

L'ambiente di sviluppo presentava un problema critico che impediva qualsiasi commit. Dopo un'analisi approfondita, è stata identificata la causa:

*   **Causa:** L'esecuzione automatica dell'intera suite di test (`npm test` o `vitest run`) prima di ogni commit.
*   **Sintomo:** Il processo di commit falliva silenziosamente o con un errore generico `Resource has been exhausted`.
*   **Soluzione Temporanea Applicata:** È stata aggiunta una regola `exclude` nel file `vite.config.ts` per disabilitare temporaneamente l'esecuzione di tutti i file di test, sbloccando così i commit e permettendo la ripresa dello sviluppo.

### Implementazione Esistente per le Notifiche:

Contrariamente alle prime ipotesi, l'applicazione possiede già una sezione di notifiche robusta e ben strutturata in `src/pages/NotificationsPage.tsx`. Questa pagina gestisce sia la visualizzazione dello storico (`HistoryView` e `SentNotificationsList`) sia un'interfaccia per l'invio (`SendNotificationView` e `InviaNotificaDialog`). La logica di recupero dati da Firestore è gestita in modo efficiente tramite `react-firebase-hooks`.

---

## 2. Piano di Lavoro Dettagliato

Questo piano è diviso in fasi per affrontare i problemi in ordine di priorità, garantendo la stabilità dell'ambiente e la corretta implementazione delle nuove funzionalità.

### Fase 1: Stabilizzazione e Pulizia (Completata)

*   **Azione 1.1: Verifica e Rimozione File Superflui** - Completato.
*   **Azione 1.2: Aggiornamento di questo Blueprint** - Completato.

### Fase 2: Completamento Funzionalità Notifiche (Completata)

*   **Azione 2.1: Analisi Approfondita di `InviaNotificaDialog.tsx`** - Completato.
*   **Azione 2.2: Adeguamento del Modello Dati** - Completato.
*   **Azione 2.3: Test Funzionale Completo** - Completato.

### Fase 3: Risoluzione del Debito Tecnico dei Test (Completata)

*   **Azione 3.1: Riattivazione Controllata dei Test** - Completato.
*   **Azione 3.2: Identificazione e Correzione del Test problematico** - Completato.
*   **Azione 3.3: Ripristino Completo della Suite di Test** - Completato.

### Fase 4: Correzione Massiva di Linting e Qualità del Codice (In Corso)

L'obiettivo di questa fase è risolvere la grande quantità di errori e avvisi emersi dall'analisi di ESLint per migliorare la stabilità, la manutenibilità e la qualità generale del codice.

*   **Azione 4.1: Risoluzione Errori Critici**
    *   **Stato:** In Corso
    *   **Descrizione:** Sono stati identificati e si stanno correggendo gli errori che hanno la maggiore probabilità di indicare bug reali nel codice. Questo include:
        *   `no-dupe-keys`: Corretto in `RapportinoForm.tsx` per prevenire la duplicazione di chiavi negli oggetti.
        *   `no-case-declarations`: Corretto in `GenericForm.tsx` per garantire lo scope corretto delle variabili all'interno degli statement `switch`.
        *   `no-useless-catch`: Corretto in `DataContext.tsx` rimuovendo i blocchi `try...catch` ridondanti.
        *   `@typescript-eslint/ban-ts-comment`: Corretto in `RapportinoPrint.tsx` sostituendo `@ts-ignore` con `@ts-expect-error`.
        *   `no-useless-escape`: In corso. Corretto il primo caso in `AddUserDialog.tsx` e si procede con gli altri file.

*   **Azione 4.2: Correzione Avvisi di Stabilità (Hooks di React)**
    *   **Stato:** Da Iniziare
    *   **Descrizione:** Affrontare tutti gli avvisi `react-hooks/exhaustive-deps`. La mancanza di dipendenze corrette negli array di dipendenza di `useEffect`, `useCallback` e `useMemo` può portare a bug difficili da tracciare, come la mancata riesecuzione di effetti o la creazione di callback obsolete.

*   **Azione 4.3: Miglioramento della Tipizzazione**
    *   **Stato:** Da Iniziare
    *   **Descrizione:** Ridurre l'uso di `any` (`@typescript-eslint/no-explicit-any`) sostituendolo con tipi più specifici. Questo aumenterà la sicurezza del tipo (type safety) dell'applicazione, ridurrà i bug a runtime e migliorerà la leggibilità e la manutenibilità del codice.

*   **Azione 4.4: Pulizia Generale del Codice (In corso)**
    *   **Stato:** In corso
    *   **Descrizione:** Rimuovere tutte le variabili, le funzioni e le importazioni non utilizzate (`@typescript-eslint/no-unused-vars`) per alleggerire il codice e migliorare la chiarezza.
