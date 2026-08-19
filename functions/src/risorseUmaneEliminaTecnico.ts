
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const REGION = "europe-west1";

interface EliminaTecnicoData {
    uid: string;
}

export const eliminaTecnico = onCall({ region: REGION }, async (request) => {
    if (request.auth?.token.role !== 'admin') {
        logger.error(
            `Tentativo non autorizzato. UID: ${request.auth?.uid || 'Nessuno'}`
        );
        throw new HttpsError(
            "permission-denied",
            "Solo gli amministratori possono eliminare i tecnici."
        );
    }

    const { uid } = request.data as EliminaTecnicoData;
    if (!uid) {
        throw new HttpsError(
            "invalid-argument",
            "Dati non validi. È necessario fornire 'uid'."
        );
    }

    logger.info(`Richiesta di eliminazione per UID: ${uid} dall'admin: ${request.auth.token.email}`);

    try {
        await admin.auth().deleteUser(uid);
        await admin.firestore().collection("tecnici").doc(uid).delete();

        logger.info(`Tecnico con UID: ${uid} eliminato con successo.`);
        return { status: "success", message: `Tecnico con UID: ${uid} eliminato.` };

    } catch (error: any) {
        logger.error(`Errore durante l'eliminazione del tecnico con UID ${uid}:`, error);
        if (error.code === 'auth/user-not-found') {
            throw new HttpsError("not-found", `Nessun utente trovato con UID: ${uid}.`);
        }
        throw new HttpsError(
            "internal",
            `Errore interno durante l'eliminazione. ${error.message}`
        );
    }
});
