
import * as admin from "firebase-admin";

// Inizializza l'app solo una volta
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Esporta le istanze dei servizi che verranno utilizzate in tutta l'applicazione
export const db = admin.firestore();
export const auth = admin.auth();
