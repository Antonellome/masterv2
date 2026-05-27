# Guida Tecnica Completa per l'Integrazione delle Notifiche (App Tecnici)

## Panoramica del Sistema

Il sistema di notifiche è basato su **Firestore**. L'app "Master" non invia notifiche push dirette (FCM) ai dispositivi. Invece, scrive un documento di notifica in una collezione condivisa. L'app dei tecnici deve implementare un **listener in tempo reale** su questa collezione per "ascoltare" l'arrivo di nuovi messaggi, determinare se sono pertinenti per l'utente attuale e, in caso affermativo, visualizzare una notifica locale sul dispositivo.

---

### 1. Collezione Firestore da Ascoltare

Il punto centrale del sistema è la collezione Firestore:

-   **Nome Collezione**: `notifiche`

L'app dei tecnici deve stabilire un listener `onSnapshot` su questa collezione, ordinando i risultati per data di creazione per processare solo i nuovi messaggi.

**Esempio di Query:**
```javascript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const q = query(
  collection(db, 'notifiche'),
  where('createdAt', '>', new Date()), // Per ascoltare solo le nuove notifiche
  orderBy('createdAt', 'desc')
);

const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      const notifica = change.doc.data();
      // ... implementare la logica di targeting qui ...
    }
  });
});
```

---

### 2. Struttura del Documento di Notifica (`notifiche/{docId}`)

Ogni documento in questa collezione rappresenta una notifica e ha la seguente struttura JSON:

```json
{
  "title": "Titolo della Notifica",
  "body": "Corpo del messaggio...",
  "createdAt": Timestamp,
  "senderId": "UID_admin_mittente",
  "senderName": "Nome Cognome Admin",
  "target": {
    "type": "user" | "category" | "all",
    "id": "...", // UID utente, nome categoria, o 'all'
    "name": "..." // Nome descrittivo per display
  }
}
```

---

### 3. Logica di Targeting da Implementare (App Tecnici)

All'interno del listener `onSnapshot`, per ogni nuovo documento ricevuto, l'app deve eseguire la seguente logica per determinare se la notifica è pertinente per l'utente corrente.

**Presupposto:** L'app deve avere accesso ai dati del tecnico attualmente autenticato, in particolare il suo **ID utente (UID)** e la sua **categoria di appartenenza**. Si presume che questi dati siano disponibili nel profilo utente (ad esempio, da un documento nella collezione `tecnici`).

**Funzione di Logica (Esempio):**

```javascript
function èNotificaPerMe(notifica, tecnicoCorrente) {
  const { target } = notifica;
  
  if (!target || !tecnicoCorrente) {
    return false;
  }

  switch (target.type) {
    case 'user':
      // La notifica è per un utente specifico.
      // Confronta l'ID del target con l'UID del tecnico.
      return target.id === tecnicoCorrente.uid;

    case 'category':
      // La notifica è per una categoria di tecnici.
      // Confronta l'ID del target (nome categoria) con la categoria del tecnico.
      return target.id === tecnicoCorrente.categoria;

    case 'all':
      // La notifica è per tutti.
      // Si presume che l'utente sia abilitato, quindi la riceve.
      return true;

    default:
      return false;
  }
}

// Esempio di utilizzo nel listener:
// const èPerMe = èNotificaPerMe(notifica, mioProfiloTecnico);
// if (èPerMe) {
//   mostraNotificaLocale(notifica.title, notifica.body);
// }
```

---

### 4. Considerazioni Cruciali

-   **Notifiche Locali**: Una volta stabilito che la notifica è pertinente, l'app deve usare una libreria di notifiche locali (come `expo-notifications`, `react-native-push-notification`, o equivalenti) per visualizzare effettivamente il messaggio all'utente.
-   **Notifiche in Background/App Chiusa (FONDAMENTALE)**: Il metodo `onSnapshot` funziona in modo affidabile **solo quando l'app è in primo piano (foreground)**. Per garantire la ricezione delle notifiche quando l'app è in background o chiusa, è **indispensabile** utilizzare **Firebase Cloud Functions**. La funzione serverless dovrebbe:
    1.  Essere attivata dall'evento `onCreate` sulla collezione `notifiche`.
    2.  Leggere il documento della nuova notifica.
    3.  Eseguire la logica di targeting per identificare tutti i tecnici destinatari.
    4.  Recuperare i token di registrazione FCM (che devono essere salvati nei profili utente, es. `tecnici/{uid}/fcmToken`) per ogni tecnico destinatario.
    5.  Utilizzare l'**Admin SDK di FCM** per inviare una notifica push a ciascun token.

Questo approccio ibrido (listener `onSnapshot` per l'app attiva, Cloud Function per l'app in background/chiusa) garantisce una consegna affidabile delle notifiche in ogni scenario.
