
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

interface GestisciUtentiData {
    action: 'createUser' | 'updateUser' | 'deleteUser' | 'toggleRole';
    uid?: string;
    email?: string;
    nome?: string;
    password?: string;
    role?: 'admin' | 'user';
}

export const amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data: GestisciUtentiData, context: functions.https.CallableContext) => {
    // --- NUOVO CONTROLLO AUTORIZZAZIONE BASATO SU CUSTOM CLAIMS ---
    if (!context.auth || context.auth.token.admin !== true) {
        logger.error(`Tentativo non autorizzato da UID: ${context.auth?.uid}`);
        throw new functions.https.HttpsError("permission-denied", "Solo un amministratore può eseguire questa operazione.");
    }
    // --- FINE CONTROLLO AUTORIZZAZIONE ---

    const { action } = data;
    const adminEmail = context.auth.token.email;
    logger.info(`Azione '${action}' richiesta da admin: ${adminEmail}`);

    try {
        switch (action) {
            case 'createUser':
                if (!data.email || !data.password || !data.nome) {
                    throw new functions.https.HttpsError("invalid-argument", "Email, password e nome sono richiesti.");
                }
                const userRecord = await admin.auth().createUser({ email: data.email, password: data.password, displayName: data.nome });
                logger.info(`Utente creato in Auth con UID: ${userRecord.uid}`);

                await admin.firestore().collection('utenti_master').doc(userRecord.uid).set({
                    nome: data.nome,
                    email: data.email,
                    telefono: 'N/D',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                logger.info(`Documento creato in utenti_master per UID: ${userRecord.uid}`);
                
                // Imposta il ruolo iniziale come 'user' (claim nullo o false)
                await admin.auth().setCustomUserClaims(userRecord.uid, { admin: false });
                logger.info(`Custom claim impostato per UID: ${userRecord.uid} (admin: false)`);

                return { status: "success", message: `Utente ${data.nome} creato.`, uid: userRecord.uid };

            case 'updateUser':
                if (!data.uid || !data.nome) {
                    throw new functions.https.HttpsError("invalid-argument", "UID e nome sono richiesti.");
                }
                await admin.auth().updateUser(data.uid, { displayName: data.nome });
                await admin.firestore().collection('utenti_master').doc(data.uid).update({ nome: data.nome, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                logger.info(`Utente ${data.uid} aggiornato.`);
                return { status: "success", message: "Utente aggiornato." };

            case 'deleteUser':
                if (!data.uid) {
                    throw new functions.https.HttpsError("invalid-argument", "L'UID è richiesto.");
                }
                if (data.uid === context.auth.uid) {
                    throw new functions.https.HttpsError("permission-denied", "Un admin non può eliminare se stesso.");
                }
                await admin.auth().deleteUser(data.uid);
                await admin.firestore().collection('utenti_master').doc(data.uid).delete();
                // La collezione 'admins' non è più necessaria.
                logger.info(`Utente ${data.uid} eliminato da Auth e Firestore.`);
                return { status: "success", message: "Utente eliminato." };

            case 'toggleRole':
                if (!data.uid || !data.role) {
                    throw new functions.https.HttpsError("invalid-argument", "UID e ruolo sono richiesti.");
                }
                if (data.uid === context.auth.uid) {
                    throw new functions.https.HttpsError("permission-denied", "Non puoi modificare il tuo stesso ruolo.");
                }

                const isAdmin = data.role === 'admin';
                await admin.auth().setCustomUserClaims(data.uid, { admin: isAdmin });

                if (isAdmin) {
                    logger.info(`Utente ${data.uid} promosso ad admin.`);
                } else {
                    logger.info(`Privilegi admin revocati per l'utente ${data.uid}.`);
                }
                return { status: "success", message: "Ruolo utente aggiornato con Custom Claims." };

            default:
                logger.warn(`Azione non riconosciuta: '${action}'.`);
                throw new functions.https.HttpsError("unimplemented", `L'azione '${action}' non è supportata.`);
        }
    } catch (error: any) {
        logger.error(`Errore durante l'azione '${action}' per UID ${data.uid || 'N/D'}:`, error);
        if (error.code?.startsWith('auth/')) {
             throw new functions.https.HttpsError("already-exists", error.message);
        }
        throw new functions.https.HttpsError("internal", `Errore interno: ${error.message}`);
    }
});
