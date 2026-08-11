
// src/services/notificationService.ts
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import { INotification } from '@/models/definitions';

let unsubscribe: Unsubscribe | null = null;

/**
 * Inizializza il listener di Firestore per le notifiche dell'utente corrente.
 * Si sottoscrive ai cambiamenti e aggiorna lo store globale.
 * Restituisce una funzione per annullare la sottoscrizione.
 */
export function initializeNotificationListener() {
  // Annulla qualsiasi sottoscrizione precedente per evitare listener multipli
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  const { user, setNotifications, setNotificationsLoading } = useGlobalStore.getState();

  if (!user) {
    setNotifications([]);
    setNotificationsLoading(false);
    return; // Nessun utente, nessuna notifica
  }

  setNotificationsLoading(true);

  const q = query(
    collection(db, 'notifications'),
    where("recipientId", "==", user.uid)
  );

  unsubscribe = onSnapshot(q, 
    (querySnapshot) => {
      const notifs = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as INotification))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      
      // Aggiorna lo store globale con i nuovi dati
      setNotifications(notifs);
    },
    (error) => {
      console.error("Errore nel fetch delle notifiche: ", error);
      setNotificationsLoading(false);
    }
  );
}

/**
 * Interrompe l'ascolto delle notifiche.
 */
export function cleanupNotificationListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
