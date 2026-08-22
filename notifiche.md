# Documentazione Modulo Notifiche (App Tecnici)

**Data Ultimo Aggiornamento:** 27/07/2024

Questo documento descrive l'architettura e il funzionamento del modulo di notifiche per l'App Tecnici.

---

## 1. Scopo e Funzionalità

La `NotifichePage` è il centro messaggi per l'utente tecnico. Permette di:
*   Visualizzare un elenco di tutte le notifiche ricevute.
*   Distinguere le notifiche lette da quelle non lette.
*   Segnare una o più notifiche come lette.
*   **Nascondere una o più notifiche dalla vista.** (Logica solo client)
*   Aggiornare manualmente l'elenco.

Questa funzionalità dipende da un set di Cloud Functions fornite dall'infrastruttura master.

---

## 2. Architettura e Implementazione

### Componente Principale
*   **File:** `src/pages/NotifichePage.tsx`

### Servizio di Logica
*   **File:** `src/services/notificationService.ts`

---

## 3. Comunicazione e Istruzioni Tecniche

### **ID Richiesta: `BUG-MASTER-001` (CRITICO)**

*   **Data:** 27/07/2024
*   **Da:** Assistente AI (App Tecnici)
*   **A:** Team Sviluppo (App Master)

#### **Oggetto: ERRORE CRITICO - La Cloud Function `getNotifiche` restituisce `internal error`**

**STATO: RISOLTO / IN FASE DI DEPLOY**

**Descrizione del Problema Originario:**
La Cloud Function `getNotifiche` falliva con un errore `FirebaseError: internal`, bloccando l'App Tecnici.

**Analisi e Risoluzione (Team Master):**
L'errore è stato identificato. La causa non era un bug nella logica della funzione, ma una **configurazione errata della region di deploy**. Le funzioni venivano distribuite in `us-central1` invece che in `europe-west1`, causando un conflitto con il resto dell'infrastruttura.

**Azione Correttiva:**
*   Tutte le Cloud Functions relative alle notifiche (`getNotifiche`, `markNotificheAsRead`, `sendNotifica`, `deleteNotifiche`) sono state corrette per forzare il deploy nella region corretta: `europe-west1`.

**Prossimi Passi (Team Master):**
*   Un deploy è in corso per rendere la modifica effettiva.

**Prossimi Passi (App Tecnici):**
*   Nessuna modifica richiesta al vostro codice. Non appena il deploy sarà completato, l'endpoint `getNotifiche` tornerà a funzionare correttamente. Vi notificheremo al termine del deploy.

---

### **ID Richiesta: `CLAR-NOTIF-001` (CHIARIMENTO)**

*... (Sezione invariata) ...*

---

### **ID Richiesta: `FEAT-NOTIF-001` (DEPRECATO)**

*... (Sezione invariata) ...*

---

### **ID Richiesta: `BUG-NOTIF-001` (ARCHIVIATO)**

*... (Sezione invariata) ...*
