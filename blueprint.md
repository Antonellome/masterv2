# Blueprint di Sviluppo - Applicazione RISO M-O-V3

## Panoramica

Questo documento serve come fonte di verità per lo sviluppo e la manutenzione dell'ecosistema di applicazioni (App Master Office e App Tecnici). Traccia le decisioni architetturali, le strategie di refactoring e i piani d'azione per risolvere i problemi critici.

---

## Stato Iniziale e Problema Rilevato

*... (Sezioni R.1 - R.4 invariate) ...*

### **FASE N.1: Implementazione e Bonifica Sistema di Notifiche (COMPLETATA)**
*   **Obiettivo:** Correggere i bug critici, rendere sicuro e completare il sistema di notifiche bidirezionale tra l'App Master e l'App Tecnici.

*   **Architettura Finale e Decisioni:**
    1.  **Region Standardizzata:** Tutte le Cloud Functions sono state forzate ad operare in `europe-west1` per risolvere il bug critico `internal` causato da un disallineamento di region.
    2.  **App Master (Invio):** Invia notifiche tramite la Cloud Function `sendNotifica`, riservata agli admin.
    3.  **App Master (Cancellazione):** Utilizza la nuova Cloud Function `deleteNotificationBatch` per eliminare in modo sicuro intere cronologie di notifiche, centralizzando la logica sul backend.
    4.  **App Tecnici (Ricezione):** 
        *   Usa `getNotifiche` per recuperare la lista delle notifiche.
        *   Usa `markNotificheAsRead` per segnare le notifiche come lette.
        *   **NON usa `deleteNotifiche`**. Come da loro richiesta, l'eliminazione è gestita come un'azione di "nascondi" solo sul client (es. usando il localStorage).

*   **Cloud Functions Implementate (`europe-west1`):**
    *   `sendNotifica`: (Admin) Invia notifiche a target specifici.
    *   `getNotifiche`: (Tecnico) Recupera le proprie notifiche.
    *   `markNotificheAsRead`: (Tecnico) Segna le proprie notifiche come lette.
    *   `deleteNotifiche`: (Tecnico/Admin) Funzione di eliminazione granulare, attualmente non usata dall'App Tecnici.
    *   `deleteNotificationBatch`: (Admin) **NUOVA FUNZIONE** per eliminare in modo sicuro un intero lotto di notifiche dal backend.

*   **Piano d'Azione Eseguito:**
    1.  **Risolto Bug Critico `internal`:** Identificato e risolto il problema della region, deployando tutte le funzioni in `europe-west1`. (FATTO)
    2.  **Comunicato con App Tecnici:** Aggiornato `notifiche.md` con la soluzione, sbloccando il loro sviluppo. (FATTO)
    3.  **Sviluppata Funzione di Cancellazione Sicura:** Creata e deployata la funzione `deleteNotificationBatch` per l'App Master. (FATTO)
    4.  **Aggiornato Blueprint:** Documentate tutte le modifiche. (FATTO)

*   **Prossimi Passi (Refactoring App Master):**
    *   Aggiornare il componente frontend `SentNotificationsList.tsx` nell'App Master per utilizzare la nuova funzione `deleteNotificationBatch` attraverso il `notificationService`, rimuovendo la logica di cancellazione dal client.
