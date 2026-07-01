import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * Funzione onCall per forzare l'assegnazione del ruolo di amministratore a un utente.
 * Imposta un custom claim `admin` a `true` per l'utente che la invoca.
 */
export const forceAdmin = onCall(
    { region: "europe-west1", cors: true }, // Imposta la regione e abilita CORS
    async (request) => {
        // 1. Controlla che la richiesta sia autenticata
        if (!request.auth) {
            logger.error("forceAdmin: Richiesta non autenticata.");
            throw new HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
        }

        const uid = request.auth.uid;
        logger.info(`forceAdmin: Inizio processo per UID: ${uid}`);

        try {
            // 2. Imposta il custom claim utilizzando l'SDK di Admin
            await admin.auth().setCustomUserClaims(uid, { admin: true });

            logger.info(`forceAdmin: Custom claim 'admin: true' impostato con successo per l'UID: ${uid}.`);

            // 3. Restituisce un risultato di successo
            return {
                success: true,
                message: `L'utente ${uid} è stato promosso ad amministratore.`
            };
        } catch (error) {
            logger.error(`forceAdmin: Errore durante l'impostazione del custom claim per l'UID: ${uid}`, error);
            throw new HttpsError("internal", "Si è verificato un errore interno durante l'assegnazione dei permessi.");
        }
    }
);
