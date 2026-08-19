
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const REGION = "europe-west1";

interface ForceAdminData {
  email: string;
}

/**
 * Funzione Callable per forzare un utente a diventare admin.
 * RICHIEDE CHE IL CHIAMANTE SIA GIÀ UN ADMIN.
 */
export const forceAdmin = onCall({ region: REGION }, async (request) => {
  // 1. Controlla che chi chiama sia un admin.
  if (request.auth?.token.role !== 'admin') {
    logger.error(`Tentativo non autorizzato di usare forceAdmin da UID: ${request.auth?.uid}`);
    throw new HttpsError("permission-denied", "Solo un amministratore può usare questa funzione.");
  }
  
  const { email } = request.data as ForceAdminData;
  if (!email) {
    throw new HttpsError("invalid-argument", "L'indirizzo email è richiesto.");
  }

  logger.info(`L'admin ${request.auth.token.email} sta promuovendo l'utente con email: ${email}`);

  try {
    // 2. Trova l'utente tramite email
    const userRecord = await admin.auth().getUserByEmail(email);
    const { uid } = userRecord;

    // 3. Imposta il Custom Claim standard 'role'
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' });

    logger.info(`SUCCESS: Utente ${email} (UID: ${uid}) è stato promosso ad amministratore.`);
    
    return {
      status: "success",
      message: `L'utente ${email} è ora un amministratore.`,
    };
  } catch (error: any) {
    logger.error(`Errore durante la promozione dell'utente ${email}:`, error);
    if (error.code === 'auth/user-not-found') {
        throw new HttpsError("not-found", `Nessun utente trovato con l'email ${email}.`);
    }
    throw new HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
  }
});
