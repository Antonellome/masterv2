
# RISO Project Blueprint

## Panoramica

RISO (Reportistica Interventi Software Operativi) è un'applicazione web progettata per la gestione centralizzata dei rapportini di intervento dei tecnici. L'app permette agli amministratori di creare, modificare, e analizzare i report, gestire le anagrafiche (tecnici, clienti, veicoli, etc.) e monitorare le attività tramite una dashboard.

## Funzionalità Implementate

*   **Autenticazione Sicura:** Login e gestione utenti tramite Firebase Authentication.
*   **Dashboard Riepilogativa:** Grafici e KPI per una visione d'insieme delle ore lavorate, tipi di intervento e performance dei tecnici.
*   **Gestione Report (CRUD):** Creazione, visualizzazione, modifica ed eliminazione dei rapportini giornalieri.
*   **Anagrafiche Centralizzate:** Gestione completa di tutte le entità di business (tecnici, clienti, sedi, veicoli, navi, luoghi, ditte).
*   **Sincronizzazione Dati:** L'app "Tecnici" satellite sincronizza i dati anagrafici per l'uso offline.
*   **Notifiche Push:** Invio di notifiche mirate a singoli tecnici, a categorie o a tutti gli utenti.
*   **Esportazione PDF Singola:** Possibilità di stampare/esportare in PDF un singolo rapportino dalla sua pagina di dettaglio.
*   **Correzioni Bug:**
    *   Risolto errore di conversione `Timestamp` in `Date` nella pagina di modifica report.
    *   Allineate le definizioni dei tipi (`definitions.ts`) con la struttura dati reale del backend (rimozione di `ruolo`, aggiunta `AppNotification`).
    *   Corretti i nomi delle collezioni usate dal servizio di sincronizzazione (`dataSync.ts`).

## Piano di Sviluppo Attuale: Miglioramenti Pagina Reportistica

**Obiettivo:** Migliorare l'usabilità e le funzionalità della pagina di elenco dei report mensili.

### Passi Implementativi

1.  **Installazione Dipendenze per PDF:**
    *   Verranno aggiunte le librerie `jspdf` e `html2canvas` per la generazione di documenti PDF lato client.
    *   Comando da eseguire: `npm install jspdf html2canvas`.

2.  **Implementazione Righe Cliccabili:**
    *   **File:** `src/pages/ReportisticaPage.tsx` (o il componente che contiene la `DataGrid`).
    *   **Azione:** Verrà aggiunto un handler `onRowClick` alla `DataGrid` di MUI.
    *   **Logica:** Al click, l'handler recupererà l'ID del report dalla riga cliccata e utilizzerà il hook `useNavigate` di React Router per reindirizzare l'utente alla pagina di modifica (`/reportistica/edit/:id`).

3.  **Implementazione Esportazione PDF Multi-Pagina:**
    *   **File:** `src/pages/ReportisticaPage.tsx`.
    *   **Azione:** Verrà aggiunto un nuovo pulsante "Esporta Tutti in PDF".
    *   **Logica:**
        1.  Al click, verrà attivata una funzione di esportazione che riceverà la lista completa dei report attualmente visualizzati.
        2.  La funzione creerà una nuova istanza di `jsPDF`.
        3.  Verrà creato un contenitore `div` nascosto fuori dallo schermo.
        4.  La funzione ciclerà su ogni report:
            a. Renderizzerà il componente `RapportinoPrint` (già esistente) per il report corrente all'interno del `div` nascosto.
            b. Userà `html2canvas` per "catturare" l'output del `div` come immagine.
            c. Aggiungerà l'immagine catturata a una nuova pagina nel documento `jsPDF`.
            d. Se non è l'ultimo report, aggiungerà una pagina vuota (`doc.addPage()`).
        5.  Una volta completato il ciclo, il file PDF finale verrà salvato e proposto al download con il nome `report_mensili.pdf`.
        6.  Verrà gestito uno stato di "loading" per fornire un feedback visivo all'utente durante la generazione del PDF.
