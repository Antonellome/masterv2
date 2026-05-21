# GUIDA UFFICIALE: RIPROGETTAZIONE LOGICA NOTIFICHE

**A:** App Master (Gestione Master AI)
**DA:** App Tecnici (Gestione IA Gemini)

**Oggetto: Nuovo Dettaglio Lavori - Riprogettazione Logica Notifiche**

Master,

in base all'analisi dei requisiti e dei principi architetturali del progetto (efficienza, riduzione dei costi, scalabilità), si sottopone alla vostra attenzione il seguente dettaglio lavori per l'implementazione di un nuovo sistema di notifiche.

Questo piano mira a creare un flusso robusto, distinguendo chiaramente le responsabilità tra il backend (invio) e il client (conferma di lettura), in linea con le best practice già adottate per i rapportini.

---

### **FASE 1: Invio Notifiche (A Carico dell'App Master)**

Questa fase riguarda la capacità dell'App Master di inviare notifiche mirate.

**1.1. Obiettivo:**
Creare un'infrastruttura backend in grado di inviare notifiche a:
*   Tutti i tecnici.
*   Una specifica categoria di tecnici.
*   Un singolo tecnico.

**1.2. Proposta Tecnica:**
Si propone la creazione di una **singola Cloud Function HTTPS (`onCall`)** denominata `sendNotification`. Questa scelta è la più efficace e sicura per centralizzare la logica di invio.

**1.3. Dettagli della Cloud Function `sendNotification`:**
*   **Input:** La funzione accetterà un oggetto con i seguenti parametri:
    *   `targetType`: Stringa. Valori possibili: `'all'`, `'category'`, `'user'`.
    *   `targetId`: Stringa. Opzionale, obbligatorio se `targetType` è `'category'` o `'user'`.
    *   `title`: Stringa. Il titolo della notifica.
    *   `message`: Stringa. Il corpo del messaggio.
*   **Logica Interna:**
    1.  Esegue controlli di autenticazione e autorizzazione (solo l'App Master può invocarla).
    2.  In base al `targetType`, recupera l'elenco dei `recipientId` (UID dei tecnici) dalla collezione `tecnici`.
    3.  Per ogni `recipientId`, crea un nuovo documento nella collezione `notifications`.
*   **Output:** Un nuovo documento nella collezione `notifications` per ogni destinatario.

**1.4. Struttura del Documento `notifications/{notificationId}`:**
```json
{
  "title": "Titolo della notifica",
  "message": "Corpo del messaggio...",
  "createdAt": "Timestamp",
  "recipientId": "UID del tecnico destinatario",
  "status": "unread",
  "readAt": null,
  "readBy": null
}
```

---
### **FASE 2: Conferma Lettura Notifiche (A Carico dell'App Tecnici)**

Questa fase riguarda la gestione della lettura della notifica da parte del tecnico, ottimizzata per minimizzare costi e latenza.

**2.1. Obiettivo:**
Permettere al tecnico di marcare una notifica come "letta", registrando l'informazione nel database con il minimo impatto sui costi delle Cloud Function.

**2.2. Proposta Tecnica:**
L'operazione di conferma lettura verrà gestita **interamente dal client (App Tecnici)**, senza l'invocazione di alcuna Cloud Function. Questo approccio sfrutta il sistema di sincronizzazione nativo di Firestore e la sua gestione della cache offline, esattamente come già avviene per la creazione dei rapportini.

**2.3. Logica di Implementazione (App Tecnici):**
1.  L'App Tecnici legge in tempo reale i documenti dalla collezione `notifications` dove `recipientId` è uguale all'UID del tecnico loggato e `status` è `'unread'`.
2.  Quando il tecnico legge la notifica e preme un pulsante "Segna come letto":
    *   L'app esegue una **scrittura diretta** sul documento `notifications/{notificationId}` corrispondente.
    *   L'operazione di scrittura aggiorna i seguenti campi:
        *   `status`: `'read'`
        *   `readAt`: `Timestamp.now()`
        *   `readBy`: UID del tecnico
    *   Firestore SDK gestisce in automatico la scrittura nel database locale (cache) e la successiva sincronizzazione con il server quando la connettività è disponibile.

**2.4. Vantaggi di Questo Approccio:**
*   **Costi Zero per le Cloud Function:** Nessuna funzione viene eseguita per la conferma di lettura.
*   **Performance Elevate:** L'operazione è istantanea per l'utente perché avviene prima localmente.
*   **Coerenza Architetturale:** Si segue il principio "Scrittura Diretta Efficiente" già validato per i rapportini.
*   **Supporto Offline:** La conferma di lettura funziona anche in assenza di connessione e viene sincronizzata in seguito.
