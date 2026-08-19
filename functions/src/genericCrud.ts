
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const REGION = "europe-west1";

// Funzione generica per creare un documento
export const createDocument = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
  }

  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Solo un amministratore può creare un documento.");
  }

  const { collection, docData } = request.data;
  if (!collection || !docData) {
      throw new HttpsError("invalid-argument", "Collezione e dati del documento sono obbligatori.");
  }

  try {
    const docRef = await admin.firestore().collection(collection).add(docData);
    logger.info(`Admin ${request.auth.uid} ha creato un documento in ${collection} con ID: ${docRef.id}`);
    return { id: docRef.id };
  } catch (error) {
    logger.error(`Errore creazione documento in ${collection}:`, error);
    throw new HttpsError("internal", "Impossibile creare il documento.", error);
  }
});

// Funzione generica per aggiornare un documento
export const updateDocument = onCall({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
    }

    if (request.auth.token.role !== "admin") {
        throw new HttpsError("permission-denied", "Solo un amministratore può aggiornare un documento.");
    }

    const { collection, docId, docData } = request.data;
    if (!collection || !docId || !docData) {
        throw new HttpsError("invalid-argument", "Collezione, ID e dati del documento sono obbligatori.");
    }

  try {
    await admin.firestore().collection(collection).doc(docId).update(docData);
    logger.info(`Admin ${request.auth.uid} ha aggiornato il documento ${docId} in ${collection}`);
    return { success: true };
  } catch (error) {
    logger.error(`Errore aggiornamento documento ${docId} in ${collection}:`, error);
    throw new HttpsError("internal", "Impossibile aggiornare il documento.", error);
  }
});

// Funzione generica per eliminare un documento
export const deleteDocument = onCall({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
    }

    if (request.auth.token.role !== "admin") {
        throw new HttpsError("permission-denied", "Solo un amministratore può eliminare un documento.");
    }

    const { collection, docId } = request.data;
    if (!collection || !docId) {
        throw new HttpsError("invalid-argument", "Collezione e ID del documento sono obbligatori.");
    }

  try {
    await admin.firestore().collection(collection).doc(docId).delete();
    logger.info(`Admin ${request.auth.uid} ha eliminato il documento ${docId} in ${collection}`);
    return { success: true };
  } catch (error) {
    logger.error(`Errore eliminazione documento ${docId} in ${collection}:`, error);
    throw new HttpsError("internal", "Impossibile eliminare il documento.", error);
  }
});
