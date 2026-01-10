# Descrizione del Progetto R.I.S.O.

## Panoramica

Questa è una PWA (Progressive Web App) progettata per funzionare su PC e dispositivi mobili (in Hosting), che si chiama **R.I.S.O. Master Office**.

Esiste un'app complementare chiamata **R.I.S.O. App Tecnici**, che si sincronizzerà con l'app Master tramite Firestore.

## Funzionamento

### R.I.S.O. App Tecnici

*   **Generazione Report:** L'app permette ai tecnici di generare report di lavoro. L'utente che crea il report è considerato il primo tecnico della lista.
*   **Contenuto dei Report:** I report includono dettagli come i tecnici coinvolti, luoghi, navi, etc.
*   **Sincronizzazione:** I report vengono sincronizzati con l'app Master e con gli altri tecnici menzionati nel report.
*   **Report Mensili:** L'app tiene traccia di orari e costi per generare report mensili personali. Grazie alla sincronizzazione, anche i tecnici che non hanno generato direttamente un report possono accedere ai dati dei giorni lavorati (da report in cui erano inclusi) per creare il proprio consuntivo mensile.
*   **Modalità Offline:** L'app può funzionare senza connessione a internet e permette di condividere i report manualmente.

### R.I.S.O. Master Office

*   **Gestione Centralizzata:** L'app Master gestisce tutti i dati provenienti dai report dei tecnici per fornire un quadro d'insieme completo.
*   **Dashboard e Analisi:** Offre una visione d'insieme di report, luoghi, navi e presenze dei tecnici.
*   **Gestione Utenze:** Gestisce l'anagrafica dei tecnici, avvisi e notifiche.
*   **Accesso Multi-dispositivo:** Sarà utilizzata in parallelo su 2 o 3 PC/dispositivi mobili, senza differenze di livelli di accesso o utenze specifiche per chi la usa.

## Autenticazione e Gestione Accessi

*   Entrambe le applicazioni avranno un sistema di autenticazione.
*   L'app Master avrà la funzionalità di creare gli accessi per i vari tecnici, necessari per la sincronizzazione, e di gestirne lo stato (attivo/non attivo).