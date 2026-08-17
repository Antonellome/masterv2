
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

interface EliminaTecnicoData {
    uid: string;
}

export const eliminaTecnico = functions.region('europe-west1').https.onCall(async (data: EliminaTecnicoData, context: functions.https.CallableContext) => {
    if (context.auth?.token.role !== 'admin') {
        logger.error(
            `Tentativo non autorizzato. UID: ${context.auth?.uid || 'Nessuno'}`
        );
        throw new functions.https.HttpsError(
            "permission-denied",
            "Solo gli amministratori possono eliminare i tecnici."
        );
    }

    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dati non validi. È necessario fornire 'uid'."
        );
    }

    logger.info(`Richiesta di eliminazione per UID: ${uid} dall'admin: ${context.auth.token.email}`);

    try {
        await admin.auth().deleteUser(uid);
        await admin.firestore().collection("tecnici").doc(uid).delete();

        logger.info(`Tecnico con UID: ${uid} eliminato con successo.`);
        return { status: "success", message: `Tecnico con UID: ${uid} eliminato.` };

    } catch (error: any) {
        logger.error(`Errore durante l'eliminazione del tecnico con UID ${uid}:`, error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError("not-found", `Nessun utente trovato con UID: ${uid}.`);
        }
        throw new functions.https.HttpsError(
            "internal",
            `Errore interno durante l'eliminazione. ${error.message}`
        );
    }
});
