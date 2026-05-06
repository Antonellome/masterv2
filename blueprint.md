# Blueprint Applicazione "Riso-Master-Office"

## Panoramica

Questa è un'applicazione gestionale complessa progettata per l'azienda "Riso-Master-Office". L'applicazione è costruita su uno stack tecnologico moderno con React per il frontend e Firebase per il backend (Firestore, Authentication, Cloud Functions).

L'interfaccia utente è ricca e reattiva, basata sulla libreria di componenti Material-UI (MUI).

## Stato Attuale (Post-Reset)

L'ambiente è stato ripristinato a uno stato stabile ma **funzionalmente limitato**.

### Frontend

*   **Framework:** React 18 con Vite.
*   **Routing:** `react-router-dom` v6, con lazy loading per quasi tutte le pagine per ottimizzare le performance.
*   **UI:** Material-UI (MUI) con un `ThemeProvider` personalizzato.
*   **Stato Globale:** L'architettura è basata su React Context, con provider multipli per `Auth`, `Data`, `Notifications`, `Theme`, ecc.
*   **Autenticazione:** Un robusto sistema di autenticazione con `ProtectedRoute` assicura che solo gli utenti loggati possano accedere alle aree riservate.
*   **Pagine Principali:** L'app include sezioni per Dashboard, Anagrafiche (clienti, tecnici, etc.), Rapportini di lavoro, Documenti, Notifiche, Presenze, Reportistica, Scadenze, Sincronizzazione e Impostazioni.

### Backend (Cloud Functions)

*   **Sintassi:** Le funzioni sono scritte utilizzando la sintassi Firebase Functions `v2`, che è più sicura e moderna.
*   **Funzione `manageAccess`:** Una funzione `onCall` è correttamente implementata e funzionante. Permette a un utente amministratore di abilitare o disabilitare altri utenti (tecnici) aggiornando sia Firebase Auth che il documento corrispondente in Firestore.
*   **Funzione `syncDataTrigger` (MODALITÀ PROVVISORIA):** Questa è la funzione critica per le notifiche. Attualmente è in **modalità sicura/disattivata**. Si attiva correttamente quando un documento viene creato nella collezione `notificheRichieste`, ma **non esegue alcuna azione**, limitandosi a scrivere un log. Questo è stato fatto per garantire la stabilità dell'applicazione dopo i recenti problemi, ma impedisce il funzionamento della logica di notifica core.

## Prossimi Passi / Piano di Sviluppo

L'obiettivo primario è ripristinare la piena funzionalità dell'applicazione, partendo da questa base stabile.

1.  **Riattivare le Notifiche:** Il passo più urgente è implementare nuovamente la logica all'interno della funzione `syncDataTrigger` per processare le richieste dalla collezione `notificheRichieste` e inviare le notifiche push ai dispositivi corretti tramite FCM.
2.  **Verifica e Test:** Una volta riattivata la funzione, sarà necessario un ciclo di test approfondito per assicurarsi che le notifiche vengano inviate correttamente, senza introdurre instabilità.
3.  **Implementazione di Nuove Funzionalità:** Solo dopo aver ripristinato e verificato la funzionalità di base, si potrà procedere con l'aggiunta di nuove feature o la modifica di quelle esistenti.
