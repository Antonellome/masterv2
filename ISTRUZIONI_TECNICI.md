
# Direttive di Implementazione per App Tecnici: Sistema di Conferma Lettura Notifiche

**A: Team di Sviluppo App Tecnici**

**DA: Gemini, IA Architetto del Sistema**

**OGGETTO: Aggiornamento Critico del Modello Dati e Implementazione Funzionalità di Conferma Lettura**

---

## 1. Contesto e Obiettivo

L'attuale sistema di notifica è stato potenziato per consentire un tracciamento granulare e affidabile delle conferme di lettura. Il precedente flag booleano `isRead` è stato **deprecato e sostituito** con una struttura dati più potente.

L'obiettivo di questo documento è fornire le istruzioni **esatte e vincolanti** per aggiornare l'app dei tecnici al fine di garantire la compatibilità con la nuova architettura del backend.

## 2. Modifica Architetturale: Da `isRead` a `readBy`

Il modello dati del documento di notifica (`notificheRichieste`) è cambiato come segue:

*   **CAMPO DEPRECATO:** `isRead` (Boolean)
*   **NUOVO CAMPO:** `readBy` (Map)

Il nuovo campo `readBy` è una mappa (o oggetto in Firestore) in cui:
- Ogni **chiave** è l'**UID** dell'utente (tecnico) che ha letto la notifica.
- Ogni **valore** è un oggetto contenente il **nome del tecnico** e il **Timestamp** della lettura.

### Struttura del campo `readBy`

'''json
"readBy": {
  "UID_TECNICO_1": {
    "name": "Mario Rossi",
    "readAt": "2024-07-31T10:00:00Z" // Esempio di Timestamp
  },
  "UID_TECNICO_2": {
    "name": "Luca Verdi",
    "readAt": "2024-07-31T10:05:12Z"
  }
}
'''

## 3. Implementazione Obbligatoria nell'App Tecnici

È necessario modificare la logica che attualmente gestisce la marcatura di una notifica come "letta". La precedente funzione che impostava `isRead: true` deve essere **completamente sostituita** con la seguente logica.

### Logica da Implementare

All'apertura di una notifica o della schermata del centro notifiche, per ogni notifica non ancora letta dall'utente corrente, è necessario eseguire un'operazione di aggiornamento sul documento Firestore corrispondente.

L'aggiornamento non deve sovrascrivere la mappa `readBy`, ma **aggiungere una nuova entry** utilizzando la notazione a punti.

### Snippet di Codice (React / TypeScript / Firebase v9+)

Questa funzione `markAsRead` è l'implementazione di riferimento. **DEVE** essere utilizzata per garantire il corretto funzionamento del sistema.

'''typescript
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firestoreDb } from "./firebase-config"; // Assicurati di importare la tua istanza db

/**
 * Marca una notifica come letta dall'utente attualmente autenticato.
 *
 * Questa funzione aggiorna il documento della notifica in Firestore, aggiungendo
 * l'UID, il nome e il timestamp di lettura dell'utente alla mappa `readBy`.
 * La funzione è sicura e non esegue l'aggiornamento se la notifica
 * è già stata segnata come letta da questo utente.
 *
 * @param notificationId L'ID del documento della notifica da aggiornare.
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        console.error("Nessun utente autenticato. Impossibile marcare la notifica come letta.");
        return;
    }

    const notificationRef = doc(firestoreDb, 'notificheRichieste', notificationId);

    try {
        const notificationSnap = await getDoc(notificationRef);
        if (!notificationSnap.exists()) {
            console.error("La notifica non esiste.");
            return;
        }

        const notificationData = notificationSnap.data();
        const readByMap = notificationData.readBy || {};

        // Controlla se l'utente ha già letto la notifica per evitare scritture inutili
        if (readByMap[user.uid]) {
            console.log(`Notifica ${notificationId} già letta dall'utente ${user.uid}.`);
            return;
        }

        // Prepara il campo da aggiornare usando la notazione a punti
        const fieldToUpdate = `readBy.${user.uid}`;
        
        await updateDoc(notificationRef, {
            [fieldToUpdate]: {
                name: user.displayName || "Nome non disponibile", // Usa il displayName dell'utente
                readAt: serverTimestamp() // Usa il timestamp del server per coerenza
            }
        });

        console.log(`Notifica ${notificationId} marcata come letta da ${user.displayName}.`);

    } catch (error) {
        console.error(`Errore durante l'aggiornamento della notifica ${notificationId}:`, error);
        throw new Error("Impossibile completare l'operazione di lettura.");
    }
};
'''

### Utilizzo Consigliato

Si consiglia di invocare `markNotificationAsRead(notifica.id)` all'interno di un `useEffect` nella pagina del centro notifiche, iterando su tutte le notifiche non ancora lette dall'utente corrente.

L'implementazione di questa funzionalità è **mandatoria** per l'allineamento con l'ecosistema R.I.S.O. aggiornato.
