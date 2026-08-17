
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Cloud Function per recuperare SOLO gli utenti amministrativi (staff).
 * Filtra gli utenti di Firebase Auth per restituire solo quelli con il claim `livello: 'staff'`.
 */
export const admin_getAllUsers = functions.region("europe-west1").https.onCall(async (data, context) => {
    // 1. Controllo di sicurezza: solo gli admin possono chiamare questa funzione.
    if (!context.auth || context.auth.token.admin !== true) {
        logger.error(`Tentativo non autorizzato di elencare lo staff da UID: ${context.auth?.uid}`);
        throw new functions.https.HttpsError("permission-denied", "Operazione consentita solo agli amministratori.");
    }

    logger.info(`Richiesta elenco staff da admin: ${context.auth.token.email}`);

    try {
        const staffUsers: any[] = [];
        let nextPageToken: string | undefined;

        // Cicla attraverso tutti gli utenti paginati per trovarli tutti
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            
            listUsersResult.users.forEach(userRecord => {
                const customClaims = (userRecord.customClaims || {}) as { admin?: boolean; livello?: string };

                // ** LA CORREZIONE CHIAVE: FILTRA PER CLAIM `livello` **
                if (customClaims.livello === 'staff') {
                    staffUsers.push({
                        id: userRecord.uid,
                        email: userRecord.email || "N/D",
                        nome: userRecord.displayName || "Non specificato",
                        ruolo: customClaims.admin === true ? "admin" : "user",
                    });
                }
            });

            nextPageToken = listUsersResult.pageToken;

        } while (nextPageToken);

        logger.info(`Restituiti ${staffUsers.length} utenti staff.`);
        return staffUsers;

    } catch (error: any) {
        logger.error("Errore durante il recupero dell'elenco dello staff:", error);
        throw new functions.https.HttpsError("internal", `Impossibile recuperare l'elenco dello staff: ${error.message}`);
    }
});
