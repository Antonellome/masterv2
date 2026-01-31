# Documentazione dell'Applicazione: Master Office

## 1. Panoramica dell'Architettura

**Master Office** è un'applicazione React single-page costruita con Vite, TypeScript e Material-UI (MUI). Funge da pannello di amministrazione centrale per la gestione delle operazioni aziendali. L'interazione con il backend è interamente gestita tramite i servizi di Google Firebase.

### Tecnologie Chiave:

- **React**: Libreria per la costruzione dell'interfaccia utente.
- **Vite**: Build tool per lo sviluppo e il build del frontend.
- **Material-UI (MUI)**: Libreria di componenti UI per un design moderno e consistente.
- **React Router DOM**: Per la navigazione e il routing lato client.
- **Firebase**: Suite di servizi per il backend:
    - **Firestore**: Utilizzato come database NoSQL principale per tutti i dati (tecnici, clienti, rapportini, presenze, ecc.).
    - **Firebase Authentication**: Gestisce il login degli amministratori.
- **Zustand**: Per una gestione dello stato globale semplice e reattiva (es. gestione delle scadenze).

### Struttura del Codice Sorgente (`src`):

- **`components`**: Contiene componenti React riutilizzabili che formano i mattoni dell'interfaccia (es. `DataTable`, `Sidebar`, `PageTitle`).
- **`pages`**: Ogni file corrisponde a una pagina/rotta dell'applicazione (es. `DashboardPage.tsx`, `PresenzePage.tsx`).
- **`contexts`**: Fornisce dati e stati a cascata nell'albero dei componenti (es. `AuthContext`, `DataContext`).
- **`hooks`**: Hook personalizzati che incapsulano logiche riutilizzabili (es. `useFirestoreData` per l'accesso ai dati, `useAuth` per l'autenticazione).
- **`models`**: Definizioni TypeScript (`.ts`) degli oggetti di dati utilizzati nell'applicazione, garantendo la coerenza dei tipi.
- **`firebase.ts`**: File centrale per l'inizializzazione dell'app Firebase e l'esportazione delle istanze dei servizi (db, auth).
- **`theme.ts`**: Definisce il tema personalizzato di Material-UI, incluse le palette di colori per le modalità light/dark e la localizzazione in italiano.

---

## 2. Logica della Pagina Presenze (`PresenzePage.tsx`)

La pagina delle presenze offre una visione d'insieme rapida e intuitiva della situazione mensile dei tecnici, utilizzando una griglia in stile "heatmap".

### Flusso di Funzionamento:

1.  **Selezione del Mese**: L'utente (amministratore) seleziona un mese e un anno tramite appositi selettori. Di default, viene visualizzato il mese corrente.

2.  **Caricamento Dati**: Al variare del mese o dell'anno, vengono caricate due collezioni principali da Firestore:
    - La lista completa dei **tecnici** attivi.
    - La collezione dei **rapportini** relativi al mese e all'anno selezionati. I rapportini sono il "source of truth" per le presenze.

3.  **Elaborazione e Aggregazione Dati**:
    - Per ogni tecnico trovato, il sistema itera su tutti i giorni del mese selezionato.
    - Per ogni giorno, cerca se esiste un rapportino corrispondente per quel tecnico in quella data.
    - Se un rapportino esiste, il sistema ne analizza il campo `tipoGiornata` (es. "Lavoro", "Ferie", "Malattia").
    - Se non esiste alcun rapportino per un dato giorno lavorativo (dal lunedì al venerdì), quel giorno viene marcato come "Assenza Ingiustificata" (di solito rappresentata in rosso).

4.  **Rendering della Griglia**:
    - I dati aggregati vengono passati al componente `Presenze` (`/components/Presenze/Presenze.tsx`).
    - Questo componente costruisce la tabella HTML: una riga per ogni tecnico e una colonna per ogni giorno del mese.
    - Ogni cella `<td>` della tabella viene colorata in base al `tipoGiornata` trovato o alla condizione di assenza.
    - Un `Tooltip` di MUI mostra dettagli aggiuntivi al passaggio del mouse sulla cella, come il nome del tecnico e il tipo di giornata esatto.

### Punti Chiave dell'Implementazione:

- **Efficienza**: Vengono caricati solo i rapportini del mese di interesse, minimizzando le letture da Firestore.
- **Reattività**: L'uso degli hook di React (`useState`, `useEffect`) garantisce che la griglia si aggiorni automaticamente quando l'utente cambia la selezione del mese.
- **Logica Centralizzata**: La maggior parte della logica di business (aggregazione dei dati) risiede nella pagina `PresenzePage.tsx`, mentre il componente `Presenze.tsx` si occupa principalmente della visualizzazione.

---

## 3. Sistema di Notifiche (Integrazione tra `master-office` e `tecnici-app`)

Il sistema è progettato per permettere agli amministratori di inviare messaggi mirati ai tecnici e di monitorarne la lettura. L'architettura si basa su una collezione Firestore che funge da "cassetta delle lettere" per ogni tecnico.

### Funzionamento Lato `master-office` (Invio):

1.  **Interfaccia di Invio**: L'amministratore utilizza un'interfaccia (presente in `components/Notifiche/InviaNotificaDialog.tsx`) per scrivere un messaggio e selezionare uno o più tecnici destinatari.

2.  **Creazione del Documento di Notifica**: Al momento dell'invio, l'applicazione crea un nuovo documento nella collezione **`notifications`** di Firestore.

3.  **Struttura del Documento (`notifications/{notificationId}`):**
    ```json
    {
      "title": "Oggetto del messaggio",
      "body": "Testo del messaggio dell'amministratore.",
      "recipientId": "userId_del_tecnico_destinatario", // UID Firebase del tecnico
      "senderId": "userId_dell_admin_mittente",       // UID Firebase dell'admin
      "createdAt": "timestamp",                      // Data di invio
      "isRead": false                              // Stato di lettura (fondamentale)
    }
    ```

### Configurazione e Funzionamento Lato `tecnici-app` (Ricezione):

Per ricevere e visualizzare le notifiche, la nuova applicazione per i tecnici dovrà implementare la seguente logica:

1.  **Ottenere l'ID Utente**: Dopo che il tecnico ha effettuato l'accesso tramite Firebase Authentication, l'app deve ottenere il suo UID (User ID).

2.  **Query su Firestore**: L'app deve eseguire una query in tempo reale sulla collezione `notifications` per ascoltare i documenti in cui il campo `recipientId` corrisponde all'UID del tecnico loggato.

    *Esempio di query con la libreria `firebase/firestore`:*
    ```javascript
    import { collection, query, where, onSnapshot } from "firebase/firestore";

    const q = query(
      collection(db, "notifications"), 
      where("recipientId", "==", user.uid), // user.uid è l'ID del tecnico loggato
      where("isRead", "==", false)        // Opzionale: per mostrare solo le non lette
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newNotifications = [];
      querySnapshot.forEach((doc) => {
        newNotifications.push({ id: doc.id, ...doc.data() });
      });
      // Aggiorna lo stato della UI con le nuove notifiche
    });
    ```

3.  **Visualizzazione**: L'app deve visualizzare le notifiche ricevute in una lista o tramite avvisi pop-up.

4.  **Segnare come Letta**: Quando un tecnico apre/legge una notifica, l'app **deve** aggiornare il documento corrispondente in Firestore, impostando il campo `isRead` a `true`.

    *Esempio di aggiornamento:*
    ```javascript
    import { doc, updateDoc } from "firebase/firestore";

    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      isRead: true
    });
    ```
    Questo passaggio è cruciale perché permette all'app `master-office` di sapere quali messaggi sono stati letti e quali no, visualizzando lo stato di consegna.
