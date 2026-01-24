
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * FUNZIONE #1: Creazione Manuale Utente (chiamata dal frontend)
 * Crea un utente in Auth e scrive i suoi dati in Firestore.
 * Restituisce l'utente completo al client per l'aggiornamento della UI.
 */
export const createNewUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.ruolo !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono creare utenti.");
  }

  const { email, nome, ruolo } = data;
  if (!email || !nome || !ruolo) {
    throw new functions.https.HttpsError("invalid-argument", "Email, nome e ruolo sono obbligatori.");
  }

  try {
    const userRecord = await admin.auth().createUser({ email, emailVerified: false, disabled: false });
    await admin.auth().setCustomUserClaims(userRecord.uid, { ruolo });

    const userDoc = { nome, email, ruolo, disabled: false };
    await admin.firestore().collection("utenti_master").doc(userRecord.uid).set(userDoc);

    // Fondamentale: restituisce l'utente con l'ID per abilitare subito le azioni nel frontend.
    return { status: "success", newUser: { id: userRecord.uid, ...userDoc } };

  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * FUNZIONE #2: Trigger Automatico Creazione Utente (chiamata da Firebase)
 * Si attiva quando un utente viene creato in Auth (es. da terze parti o direttamente da Firebase).
 * Assicura che per ogni utente in Auth esista un documento corrispondente in Firestore con i dati base.
 * QUESTA ERA LA FUNZIONE MANCANTE CHE CAUSAVA IL BUG.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, email } = user;

  // Previene la sovrascrittura se il documento esiste già (creato da createNewUser)
  const userRef = admin.firestore().collection("utenti_master").doc(uid);
  const doc = await userRef.get();
  if (doc.exists) {
    console.log(`Il documento per l'utente ${uid} esiste già. Nessuna azione richiesta.`);
    return;
  }

  console.log(`Creazione documento per il nuovo utente: ${uid}`);
  const userDoc = {
    nome: email || 'Nuovo Utente',
    email: email || '',
    ruolo: 'user', // Ruolo di default
    disabled: false,
  };

  try {
    await userRef.set(userDoc);
    console.log(`Documento per ${uid} creato con successo.`);
  } catch (error) {
    console.error(`Errore nella creazione del documento per ${uid}:`, error);
  }
});

/**
 * FUNZIONE #3: Abilita/Disabilita Utente
 * Aggiorna lo stato 'disabled' sia in Auth che in Firestore per coerenza.
 */
export const setUserDisabledStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.ruolo !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono modificare gli utenti.");
  }

  const { uid, disabled } = data;
  if (!uid || typeof disabled !== 'boolean') {
    throw new functions.https.HttpsError("invalid-argument", "UID e stato 'disabled' sono obbligatori.");
  }

  try {
    // Aggiornamento coerente su entrambi i servizi
    await admin.auth().updateUser(uid, { disabled });
    await admin.firestore().collection("utenti_master").doc(uid).update({ disabled });

    return { status: "success", message: "Stato utente aggiornato con successo." };

  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Funzione per eliminare un utente.
 */
export const deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.ruolo !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono eliminare gli utenti.");
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "L'UID dell'utente è obbligatorio.");
  }

  try {
    await admin.auth().deleteUser(uid);
    await admin.firestore().collection("utenti_master").doc(uid).delete();
    return { status: "success", message: "Utente eliminato con successo." };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
