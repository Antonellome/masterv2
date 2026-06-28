# Blueprint di Sviluppo - R.I.S.O. App

Questo documento serve come unica fonte di verità per lo sviluppo e la manutenzione dell'applicazione. Traccia lo stato attuale, i problemi noti e il piano di azione dettagliato per le modifiche future.

---

## 1. Stato Attuale e Contesto

L'applicazione è un'interfaccia di amministrazione complessa per la gestione di tecnici, rapportini, clienti e altro. Utilizza una stack moderna basata su React, Vite, TypeScript, Material-UI e Firebase.

---

## 2. Piano di Lavoro Dettagliato e Funzionalità Implementate

Questo piano è diviso in fasi per affrontare i problemi in ordine di priorità, garantendo la stabilità dell'ambiente e la corretta implementazione delle nuove funzionalità.

### Fase 1: Stabilizzazione e Pulizia (Completata)

*   Verifica e rimozione di file superflui.
*   Aggiornamento iniziale del blueprint.

### Fase 2: Completamento Funzionalità Notifiche (Completata)

*   Analisi e adeguamento del modello dati per `InviaNotificaDialog.tsx`.
*   Test funzionale della feature di notifica.

### Fase 3: Risoluzione del Debito Tecnico dei Test (Completata)

*   Riattivazione controllata e correzione della suite di test per ripristinare il corretto funzionamento dei pre-commit hooks.

### Fase 4: Correzione Massiva di Linting e Qualità del Codice (Completata)

*   **Descrizione:** Risolti numerosi errori e avvisi emersi dall'analisi statica di ESLint per migliorare stabilità, manutenibilità e qualità del codice.

### Fase 5: Implementazione Sistema di Aggiornamento Guidato (Completata)

*   **Stato:** Completato
*   **Obiettivo:** Consentire all'utente di avviare il processo di aggiornamento dell'applicazione direttamente dall'interfaccia in modo sicuro.
*   **Componenti della Soluzione:** Implementazione di un mini-server Node.js (`update-server.js`) per eseguire uno script di aggiornamento (`update.sh`) e streaming dei log in tempo reale al frontend.

### Fase 6: Correzione Bug e Migrazione Dati Accessi Tecnici (Completata)

*   **Stato:** Completato
*   **Problema:** Switch disabilitati nella pagina di gestione accessi tecnici.
*   **Causa Radice:** Incoerenza dei dati in Firestore (campo `appAccess` non booleano).
*   **Risoluzione:** Eseguito uno script di migrazione (`migration.js`) con `firebase-admin` per standardizzare il campo `appAccess` a booleano e rimuovere il campo legacy `abilitato`.

### Fase 7: Implementazione Cancellazione Logica (Soft Delete) per Rapportini (Completata)

*   **Stato:** Completato
*   **Obiettivo:** Modificare il sistema di cancellazione dei rapportini per prevenire la perdita di dati e garantire la coerenza con l'app mobile dei tecnici.
*   **Problema:** L'eliminazione fisica dei rapportini (`deleteDoc`) causava la loro scomparsa anche dall'app dei tecnici, che invece necessita di mantenere lo storico.
*   **Soluzione Implementata:**
    1.  **Sostituzione della Logica:** La funzione di cancellazione nel file `src/pages/GestioneRapportini.tsx` è stata completamente riscritta.
    2.  **Adozione di `updateDoc`:** Invece di `deleteDoc`, ora viene utilizzata la funzione `updateDoc` di Firestore per modificare il documento del rapportino.
    3.  **Marcatore `isDeleted`:** Al documento viene aggiunto (o aggiornato) un campo `isDeleted: true`.
    4.  **Aggiornamento Timestamp:** Viene aggiornato simultaneamente il campo `updatedAt` utilizzando `serverTimestamp()`. Questo è un passaggio **cruciale** perché segnala ai client (come l'app dei tecnici) che il documento è stato modificato e deve essere risincronizzato, permettendo loro di gestire la cancellazione logica lato client.
    5.  **Filtro sulla Visualizzazione:** La query di lettura in `GestioneRapportini.tsx` è stata aggiornata con una clausola `where('isDeleted', '!=', true)` per nascondere i rapportini "cancellati" dall'interfaccia web, mantenendoli però nel database.
*   **Risultato:** I rapportini eliminati dall'app master non vengono più cancellati fisicamente, ma solo contrassegnati. Questo risolve il problema di sincronizzazione e garantisce che l'app dei tecnici mantenga uno storico coerente e completo.
