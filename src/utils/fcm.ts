
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from '@/firebase';

const VAPID_KEY = 'BGl_80oJSoC9nJ5bep0zM4uL9kR9lZ-eS3B-iQy8nsoj-ZkXGzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZ'; // Placeholder, replace with your actual key

const messaging = getMessaging(app);

export const getOrRegisterFCMToken = async (tecnicoId: string) => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Permesso di notifica concesso.');

      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (currentToken) {
        console.log('Token FCM ottenuto:', currentToken);
        await saveFCMTokenToFirestore(tecnicoId, currentToken);
      } else {
        console.log('Nessun token FCM disponibile. Richiedine uno nuovo.');
      }
    } else {
      console.log('Permesso di notifica negato.');
    }
  } catch (error) {
    // FIX: Using double quotes to avoid syntax error with the single quote in the string.
    console.error("Errore durante l'ottenimento del token FCM:", error);
  }
};

const saveFCMTokenToFirestore = async (tecnicoId: string, token: string) => {
  const tecnicoRef = doc(db, 'tecnici', tecnicoId);
  try {
    await updateDoc(tecnicoRef, {
      fcmTokens: arrayUnion(token),
    });
    console.log('Token FCM salvato con successo in Firestore.');
  } catch (error) {
    console.error('Errore nel salvataggio del token FCM:', error);
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  onMessage(messaging, (payload) => {
    console.log('Messaggio FCM ricevuto in foreground:', payload);
    callback(payload);
  });
};
