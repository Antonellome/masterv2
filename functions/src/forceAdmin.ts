
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Interfaccia per i dati in input
interface ForceAdminData {
  email: string;
}

/**
 * Funzione Callable per forzare un utente a diventare admin.
 * DA USARE CON ESTREMA CAUTELA E DA DISABILITARE/ELIMINARE DOPO L'USO.
 */
export const forceAdmin = functions.region("europe-west1").https.onCall(async (data: ForceAdminData, context: functions.https.CallableContext) => {
  // 1. Controlla che chi chiama sia un admin (o che non ci sia nessun admin per il bootstrap iniziale)
  // Per il bootstrap iniziale, commentiamo temporaneamente il controllo di sicurezza.
  /*
  if (context.auth?.token.admin !== true) {
    logger.error(`Tentativo non autorizzato di usare forceAdmin da UID: ${context.auth?.uid}`);
    throw new functions.https.HttpsError("permission-denied", "Solo un amministratore può usare questa funzione.");
  }
  */
  
  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "L'indirizzo email è richiesto.");
  }

  logger.info(`Tentativo di promuovere ad admin l'utente con email: ${email}`);

  try {
    // 2. Trova l'utente tramite email
    const userRecord = await admin.auth().getUserByEmail(email);
    const { uid } = userRecord;

    // 3. Imposta il Custom Claim
    await admin.auth().setCustomUserClaims(uid, { admin: true });

    logger.info(`SUCCESS: Utente ${email} (UID: ${uid}) è stato promosso ad amministratore.`);
    
    return {
      status: "success",
      message: `L'utente ${email} è ora un amministratore.`,
    };
  } catch (error: any) {
    logger.error(`Errore durante la promozione dell'utente ${email}:`, error);
    if (error.code === 'auth/user-not-found') {
        throw new functions.https.HttpsError("not-found", `Nessun utente trovato con l'email ${email}.`);
    }
    throw new functions.https.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
  }
});
