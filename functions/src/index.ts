
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

export const manageAccess = onCall({ region: "europe-west1" }, async (request) => {
    // 1. Authorization Check: Only admins can proceed.
    if (request.auth?.token.role !== 'admin') {
        throw new HttpsError("permission-denied", "Operazione non autorizzata. Solo un amministratore può gestire gli accessi.");
    }

    const { uid, abilitato } = request.data;
    const callerUid = request.auth.uid;

    if (typeof uid !== 'string' || typeof abilitato !== 'boolean') {
        throw new HttpsError("invalid-argument", "La funzione richiede un 'uid' (string) e 'abilitato' (boolean).");
    }

    try {
        // PATH 1: Standard update for an existing, healthy user.
        await admin.auth().updateUser(uid, { disabled: !abilitato });
        await db.collection("tecnici").doc(uid).update({ abilitato: abilitato });
        logger.info(`SUCCESS: Admin ${callerUid} updated status for existing user ${uid} to abilitato: ${abilitato}`);
        return { status: "success", message: "Stato utente aggiornato correttamente." };
    }
    catch (error: any) {
        // If the error is NOT 'user-not-found', it's a genuine, unexpected problem.
        if (error.code !== 'auth/user-not-found') {
            logger.error(`UNEXPECTED-ERROR while updating ${uid}:`, error);
            throw new HttpsError("internal", "Errore interno del server di autenticazione durante l'aggiornamento.");
        }

        // PATH 2: SELF-HEALING. The error IS 'auth/user-not-found'.
        logger.warn(`HEALING-PROCESS-STARTED: User not found in Auth with UID ${uid}.`);

        // Case A: Trying to DISABLE a non-existent user. This is an orphan record that needs cleaning.
        if (!abilitato) {
            logger.warn(`ORPHAN-RECORD-CLEANUP: Attempt to disable non-existent user ${uid}. Deleting from Firestore.`);
            await db.collection('tecnici').doc(uid).delete();
            // We throw an error to the client so the UI can refresh and show the record is gone.
            throw new HttpsError('not-found', 'Record orfano eliminato. Questo tecnico non esisteva in Authentication ed è stato rimosso.');
        }

        // Case B: Trying to ENABLE a non-existent user. This is a FIRST-TIME-PROMOTION.
        logger.info(`FIRST-TIME-PROMOTION for Firestore doc ${uid}. Starting transaction.`);
        try {
            const result = await db.runTransaction(async (transaction) => {
                const oldDocRef = db.collection("tecnici").doc(uid);
                const oldDoc = await transaction.get(oldDocRef);

                if (!oldDoc.exists) {
                    throw new HttpsError("not-found", `PANIC: The source document ${uid} was not found during transaction. Aborting.`);
                }

                const tecnicoData = oldDoc.data()!
                const userEmail = tecnicoData.email;

                if (!userEmail) {
                    throw new HttpsError("invalid-argument", `CRITICAL: Email field is missing in source document ${uid}. Cannot create user.`);
                }

                // Check if a user with this email already exists in Auth, maybe from a past failed attempt.
                let userRecord;
                try {
                    userRecord = await admin.auth().getUserByEmail(userEmail);
                    logger.warn(`EXISTING-AUTH-USER-FOUND: User with email ${userEmail} already exists (UID: ${userRecord.uid}). Linking this Auth record.`);
                } catch (e: any) {
                    if (e.code === 'auth/user-not-found') {
                        // This is the ideal case: create the user from scratch.
                        userRecord = await admin.auth().createUser({
                            email: userEmail,
                            displayName: `${tecnicoData.nome} ${tecnicoData.cognome}`
                        });
                        logger.info(`NEW-AUTH-USER-CREATED: User for ${userEmail} created with new UID: ${userRecord.uid}`);
                    } else {
                        throw e; // Rethrow other auth errors (network, etc.)
                    }
                }

                const newUid = userRecord.uid;
                // Set custom claims and ensure the user is enabled.
                await admin.auth().setCustomUserClaims(newUid, { ...userRecord.customClaims, tecnico: true });
                await admin.auth().updateUser(newUid, { disabled: false });

                // Create the new, correct document with the Auth UID as its ID.
                const newDocRef = db.collection("tecnici").doc(newUid);
                transaction.set(newDocRef, { ...tecnicoData, abilitato: true, uid: newUid });
                // Delete the old, orphaned document.
                transaction.delete(oldDocRef);

                logger.info(`HEALING-TRANSACTION-SUCCESS: Document ${uid} migrated to ${newUid}.`);
                return { newUid: newUid };
            });

            return { status: "success", message: `Utente ${result.newUid} promosso e collegato con successo!` };

        } catch (transactionError: any) {
            logger.error(`FATAL-TRANSACTION-FAILURE for ${uid}:`, transactionError);
            if (transactionError instanceof HttpsError) {
                throw transactionError;
            }
            throw new HttpsError("internal", "La transazione di correzione dei dati è fallita criticamente.");
        }
    }
});
