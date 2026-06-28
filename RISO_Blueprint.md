
# RISO Project Blueprint

## Panoramica

RISO (Reportistica Interventi Software Operativi) è un'applicazione web progettata per la gestione centralizzata dei rapportini di intervento dei tecnici. L'app permette agli amministratori di creare, modificare, e analizzare i report, gestire le anagrafiche (tecnici, clienti, veicoli, etc.) e monitorare le attività tramite una dashboard.

## Funzionalità Implementate

*   **Autenticazione Sicura:** Login e gestione utenti tramite Firebase Authentication.
*   **Dashboard Riepilogativa:** Grafici e KPI per una visione d'insieme delle ore lavorate, tipi di intervento e performance dei tecnici.
*   **Gestione Report (CRUD):** Creazione, visualizzazione, modifica ed eliminazione dei rapportini giornalieri.
*   **Anagrafiche Centralizzate:** Gestione completa di tutte le entità di business (tecnici, clienti, sedi, veicoli, navi, luoghi, ditte).
*   **Sincronizzazione Dati:** L'app "Tecnici" satellite sincronizza i dati anagrafici per l'uso offline.
*   **Esportazione PDF Singola:** Possibilità di stampare/esportare in PDF un singolo rapportino dalla sua pagina di dettaglio.
*   **Correzioni Bug:**
    *   Risolto errore di conversione `Timestamp` in `Date` nella pagina di modifica report.
    *   Allineate le definizioni dei tipi (`definitions.ts`) con la struttura dati reale del backend (rimozione di `ruolo`, aggiunta `AppNotification`).
    *   Corretti i nomi delle collezioni usate dal servizio di sincronizzazione (`dataSync.ts`).

## Piano di Sviluppo Attuale: Implementazione Notifiche (Pull)

**Obiettivo:** Creare un'interfaccia per inviare notifiche (messaggi) ai tecnici, basata su un sistema di **pull** da Firestore.

**Fonte di Verità:** L'implementazione deve seguire **esattamente** le specifiche definite nel file `notifiche.md` presente nella root del progetto. Qualsiasi altra logica (es. notifiche push) è da considerarsi deprecata e rimossa.

### Passi Implementativi

1.  **Pulizia Codice Obsoleto:**
    *   **File:** `functions/src/index.ts`
    *   **Azione:** La Cloud Function `sendNotification` è stata **rimossa**. La logica di invio notifiche push è completamente deprecata.

2.  **Creazione Servizio Notifiche (Frontend):**
    *   **Nuovo File:** `src/services/notificationAdminService.ts`
    *   **Azione:** Creare il file contenente le funzioni `getAllTecnici` e `inviaNotifica`, come specificato in `notifiche.md`. Questo servizio interagirà direttamente con Firestore per scrivere i nuovi documenti di notifica.

3.  **Creazione Pagina di Invio Notifiche:**
    *   **Nuovo File:** `src/pages/InviaNotifichePage.tsx`
    *   **Azione:** Creare il componente React con il form di invio, utilizzando Material-UI. Il componente deve implementare la logica per caricare l'elenco dei tecnici e gestire l'invio tramite il `notificationAdminService`.

4.  **Integrazione e Routing:**
    *   **File:** `src/App.tsx` (o il file principale di routing).
    *   **Azione:** Aggiungere una nuova rotta (es. `/notifiche/invia`) che punti al componente `InviaNotifichePage`.
    *   Aggiungere un link nel menu di navigazione per accedere a questa nuova pagina.
