
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inizializza l'Admin SDK di Firebase. Le credenziali vengono gestite automaticamente nell'ambiente Cloud Functions.
admin.initializeApp();

/**
 * Funzione HTTP richiamabile per creare un nuovo utente tecnico in Firebase Authentication.
 * La funzione è sicura e richiede che la richiesta provenga da un utente autenticato (idealmente un admin).
 */
export const createTecnicoAuth = functions.region('europe-west1').https.onCall(async (data, context) => {

  // 1. Controllo di sicurezza: Verifica che la richiesta provenga da un utente autenticato.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'ERRORE: La richiesta deve essere effettuata da un utente autenticato.'
    );
  }

  // 2. Controllo dei dati in ingresso: email e password sono obbligatori.
  const { email, password, displayName } = data;
  if (!email || !password) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'ERRORE: Email e password sono campi obbligatori.'
    );
  }
  
  if (password.length < 6) {
        throw new functions.https.HttpsError(
      'invalid-argument',
      'ERRORE: La password deve contenere almeno 6 caratteri.'
    );
  }

  try {
    // 3. Creazione dell'utente tramite l'Admin SDK.
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName || email, // Usa il nome visualizzato se fornito, altrimenti l'email
      emailVerified: false, // L'email non è verificata di default
      disabled: false, // L'utente è attivo
    });

    functions.logger.info(`SUCCESSO: Creato nuovo utente tecnico con UID: ${userRecord.uid}`);

    // 4. Restituzione dell'UID del nuovo utente al client.
    return { uid: userRecord.uid };

  } catch (error: any) {
    // 5. Gestione degli errori.
    functions.logger.error("ERRORE durante la creazione dell'utente tecnico:", error);

    // Traduzione degli errori comuni di Firebase Auth in messaggi più chiari per il client.
    let clientMessage = "Si è verificato un errore sconosciuto durante la creazione dell'utente.";
    if (error.code === 'auth/email-already-exists') {
      clientMessage = "L'indirizzo email fornito è già in uso da un altro utente.";
    }

    throw new functions.https.HttpsError('internal', clientMessage, error);
  }
});

