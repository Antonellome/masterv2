
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const REGION = "europe-west1";

/**
 * Funzione per recuperare ESCLUSIVAMENTE gli utenti di amministrazione (staff e admin).
 * Filtra gli utenti per restituire solo quelli con il claim `role` impostato a 'staff' o 'admin'.
 * Richiede privilegi di amministratore.
 */
export const admin_getAllUsers = onCall({ region: REGION }, async (request) => {
    // 1. Controllo di sicurezza: solo gli admin possono chiamare questa funzione.
    if (request.auth?.token.role !== 'admin') {
        logger.error(`Tentativo non autorizzato di elencare lo staff da UID: ${request.auth?.uid}`);
        throw new HttpsError("permission-denied", "Operazione consentita solo agli amministratori.");
    }

    logger.info(`L'admin ${request.auth.token.email} richiede l'elenco dello staff amministrativo.`);

    try {
        const staffUsers: any[] = [];
        let nextPageToken: string | undefined;

        // Cicla attraverso tutti gli utenti paginati
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            
            listUsersResult.users.forEach(userRecord => {
                const customClaims = (userRecord.customClaims || {}) as { role?: string };
                const userRole = customClaims.role;

                // **FILTRO CORRETTO: SOLO UTENTI CON RUOLO 'staff' o 'admin'**
                if (userRole === 'staff' || userRole === 'admin') {
                    staffUsers.push({
                        id: userRecord.uid,
                        email: userRecord.email || "N/D",
                        nome: userRecord.displayName || "Non specificato",
                        role: userRole,
                        disabled: userRecord.disabled,
                    });
                }
            });

            nextPageToken = listUsersResult.pageToken;

        } while (nextPageToken);

        logger.info(`Restituiti ${staffUsers.length} utenti dello staff.`);
        return staffUsers;

    } catch (error: any) {
        logger.error("Errore durante il recupero dell'elenco dello staff:", error);
        throw new HttpsError("internal", `Impossibile recuperare l'elenco dello staff: ${error.message}`);
    }
});
