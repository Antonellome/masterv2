
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const REGION = "europe-west1";

interface GestisciUtentiData {
    action: 'createUser' | 'updateUser' | 'deleteUser' | 'toggleRole';
    uid?: string;
    email?: string;
    nome?: string;
    password?: string;
    role?: 'admin' | 'user';
}

export const amministrazione_gestisciUtenti = onCall({ region: REGION }, async (request) => {
    // --- CONTROLLO AUTORIZZAZIONE ---
    if (request.auth?.token.role !== "admin") {
        logger.error(`Tentativo non autorizzato da UID: ${request.auth?.uid}`);
        throw new HttpsError("permission-denied", "Solo un amministratore può eseguire questa operazione.");
    }

    const { action, uid, nome, email, password, role } = request.data as GestisciUtentiData;

    try {
        switch (action) {

            case 'createUser': {
                if (!email || !nome) {
                    throw new HttpsError("invalid-argument", "Email e nome sono richiesti per la creazione.");
                }
                const userRecord = await admin.auth().createUser({ email, password, displayName: nome });
                
                const newRole = role === 'admin' ? 'admin' : 'user';
                await admin.auth().setCustomUserClaims(userRecord.uid, { role: newRole });

                logger.info(`Utente ${nome} (${userRecord.uid}) creato con ruolo: ${newRole}.`);
                return { status: "success", message: "Utente creato con successo." };
            }

            case 'updateUser': {
                if (!uid || !nome) {
                    throw new HttpsError("invalid-argument", "UID e nome sono richiesti per l'aggiornamento.");
                }
                await admin.auth().updateUser(uid, { displayName: nome });
                logger.info(`Display Name per l'utente ${uid} aggiornato a: ${nome}.`);
                return { status: "success", message: "Nome utente aggiornato con successo." };
            }

            case 'deleteUser': {
                if (!uid) {
                    throw new HttpsError("invalid-argument", "L'UID è richiesto per l'eliminazione.");
                }
                if (uid === request.auth.uid) {
                    throw new HttpsError("permission-denied", "Un admin non può eliminare se stesso.");
                }
                await admin.auth().deleteUser(uid);
                logger.info(`Utente ${uid} eliminato da Firebase Authentication.`);
                return { status: "success", message: "Utente eliminato con successo." };
            }

            case 'toggleRole': {
                if (!uid || !role) {
                    throw new HttpsError("invalid-argument", "UID e ruolo sono richiesti.");
                }
                if (uid === request.auth.uid) {
                    throw new HttpsError("permission-denied", "Non puoi modificare il tuo stesso ruolo.");
                }

                await admin.auth().setCustomUserClaims(uid, { role });

                logger.info(`Ruolo per l'utente ${uid} aggiornato a: ${role}.`);
                return { status: "success", message: "Ruolo utente aggiornato." };
            }

            default:
                logger.warn(`Azione non riconosciuta: '${action}'.`);
                throw new HttpsError("unimplemented", `L'azione '${action}' non è supportata.`);
        }
    } catch (error: any) {
        logger.error(`Errore durante l'azione '${action}' per UID ${uid || 'N/D'}:`, error);
        // Evita di esporre dettagli interni, ma fornisce un contesto utile
        if (error.code?.startsWith('auth/')) {
            throw new HttpsError("internal", `Errore di autenticazione: ${error.message}`);
        }
        throw new HttpsError("internal", `Si è verificato un errore interno durante l'operazione.`);
    }
});
