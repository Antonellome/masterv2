
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

// NOTA: Non includere qui le credenziali di servizio, 
// le Cloud Functions le ottengono automaticamente dall'ambiente.

initializeApp();

const db = getFirestore();
const auth = getAuth();
const messaging = getMessaging();

export { db, auth, messaging };
