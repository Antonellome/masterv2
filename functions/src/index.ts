
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Funzione per creare un nuovo utente master.
 * Richiede che l'utente chiamante sia autenticato.
 */
export const createNewMasterUser = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
  }
  const { email } = request.data;
  if (!email) {
    throw new HttpsError("invalid-argument", "L'email è un parametro obbligatorio.");
  }
  try {
    const userRecord = await admin.auth().createUser({ email, emailVerified: false, disabled: false });
    await admin.firestore().collection("utenti_master").doc(userRecord.uid).set({
      email: userRecord.email,
      disabled: false,
    });
    return { id: userRecord.uid, email: userRecord.email };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto durante la creazione dell'utente.";
    console.error("Errore durante la creazione dell'utente:", error);
    throw new HttpsError("internal", message);
  }
});

/**
 * Funzione per abilitare o disabilitare un utente.
 * Richiede che l'utente chiamante sia autenticato.
 */
export const setUserDisabledStatus = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
  }
  const { uid, disabled } = request.data;
  if (typeof uid !== 'string' || typeof disabled !== 'boolean') {
    throw new HttpsError("invalid-argument", "Parametri 'uid' (string) e 'disabled' (boolean) non validi.");
  }
  try {
    await admin.auth().updateUser(uid, { disabled });
    await admin.firestore().collection("utenti_master").doc(uid).update({ disabled });
    return { message: "Stato dell'utente aggiornato con successo." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto durante l'aggiornamento dello stato utente.";
    console.error("Errore durante l'aggiornamento dello stato dell'utente:", error);
    throw new HttpsError("internal", message);
  }
});

/**
 * Funzione per eliminare un utente.
 * Richiede che l'utente chiamante sia autenticato.
 */
export const deleteUser = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
  }
  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "L'UID dell'utente è un parametro obbligatorio.");
  }
  try {
    await admin.auth().deleteUser(uid);
    await admin.firestore().collection("utenti_master").doc(uid).delete();
    return { message: "Utente eliminato con successo." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto durante l'eliminazione dell'utente.";
    console.error("Errore durante l'eliminazione dell'utente:", error);
    throw new HttpsError("internal", message);
  }
});
