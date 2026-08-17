
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Interfaccia per i dati in ingresso
interface GestisciUtentiData {
    action: 'createUser' | 'updateUser' | 'deleteUser' | 'toggleRole';
    uid?: string;
    email?: string;
    nome?: string;
    password?: string;
    role?: 'admin' | 'user';
    makeAdmin?: boolean;
}

export const amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data: GestisciUtentiData, context: functions.https.CallableContext) => {
    // --- CONTROLLO AUTORIZZAZIONE ---
    if (!context.auth || context.auth.token.admin !== true) {
        logger.error(`Tentativo non autorizzato da UID: ${context.auth?.uid}`);
        throw new functions.https.HttpsError("permission-denied", "Solo un amministratore può eseguire questa operazione.");
    }

    const { action, uid, nome, email, password, role, makeAdmin } = data;

    try {
        switch (action) {

            case 'createUser': {
                if (!email || !nome) {
                    throw new functions.https.HttpsError("invalid-argument", "Email e nome sono richiesti per la creazione.");
                }
                const userRecord = await admin.auth().createUser({ email, password, displayName: nome });
                
                const isAdmin = makeAdmin === true;
                await admin.auth().setCustomUserClaims(userRecord.uid, {
                    livello: 'staff',
                    admin: isAdmin
                });

                logger.info(`Utente ${nome} (${userRecord.uid}) creato come staff. Admin: ${isAdmin}.`);
                return { status: "success", message: "Utente creato con successo." };
            }

            case 'updateUser': {
                if (!uid || !nome) {
                    throw new functions.https.HttpsError("invalid-argument", "UID e nome sono richiesti per l'aggiornamento.");
                }
                // **FIX**: Aggiorna anche il Display Name in Firebase Authentication
                await admin.auth().updateUser(uid, { displayName: nome });
                logger.info(`Display Name per l'utente ${uid} aggiornato a: ${nome}.`);
                return { status: "success", message: "Nome utente aggiornato con successo." };
            }

            case 'deleteUser': {
                if (!uid) {
                    throw new functions.https.HttpsError("invalid-argument", "L'UID è richiesto per l'eliminazione.");
                }
                if (uid === context.auth.uid) {
                    throw new functions.https.HttpsError("permission-denied", "Un admin non può eliminare se stesso.");
                }
                await admin.auth().deleteUser(uid);
                logger.info(`Utente ${uid} eliminato da Firebase Authentication.`);
                return { status: "success", message: "Utente eliminato con successo." };
            }

            case 'toggleRole': {
                if (!uid || !role) {
                    throw new functions.https.HttpsError("invalid-argument", "UID e ruolo sono richiesti.");
                }
                if (uid === context.auth.uid) {
                    throw new functions.https.HttpsError("permission-denied", "Non puoi modificare il tuo stesso ruolo.");
                }

                // **FIX CRITICO**: Preserva i claims esistenti
                const user = await admin.auth().getUser(uid);
                const currentClaims = user.customClaims || {};
                const newIsAdmin = role === 'admin';

                await admin.auth().setCustomUserClaims(uid, {
                    ...currentClaims, // Preserva `livello: 'staff'` e altri claims
                    admin: newIsAdmin
                });

                logger.info(`Ruolo per l'utente ${uid} aggiornato. Nuovo stato admin: ${newIsAdmin}.`);
                return { status: "success", message: "Ruolo utente aggiornato." };
            }

            default:
                logger.warn(`Azione non riconosciuta: '${action}'.`);
                throw new functions.https.HttpsError("unimplemented", `L'azione '${action}' non è supportata.`);
        }
    } catch (error: any) {
        logger.error(`Errore durante l'azione '${action}' per UID ${uid || 'N/D'}:`, error);
        throw new functions.https.HttpsError("internal", `Errore interno: ${error.message}`);
    }
});
