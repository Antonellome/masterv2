
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const REGION = "europe-west1";

interface GestisciAccessoData {
    uid: string;
    action: 'enable' | 'disable';
}

export const risorseUmane_gestisciAccessoTecnico = onCall({ region: REGION }, async (request) => {
    // 1. Autenticazione e Autorizzazione
    if (request.auth?.token.role !== 'admin') {
        logger.error(
            `Tentativo non autorizzato di gestire accesso. UID: ${request.auth?.uid || 'Nessuno'}`
        );
        throw new HttpsError(
            "permission-denied",
            "Solo gli amministratori possono eseguire questa operazione."
        );
    }

    // 2. Validazione Input
    const { uid, action } = request.data as GestisciAccessoData;
    if (!uid || (action !== "enable" && action !== "disable")) {
        throw new HttpsError(
            "invalid-argument",
            "Dati non validi. Fornire 'uid' e 'action' ('enable'/'disable')."
        );
    }

    logger.info(`Richiesta di ${action} per UID: ${uid} dall'admin: ${request.auth.token.email}`);

    const db = admin.firestore();
    const auth = admin.auth();
    const newState = action === "enable";

    try {
        // 3. Trova il documento del tecnico basandosi sul CAMPO 'uid'.
        const tecniciRef = db.collection("tecnici");
        const querySnapshot = await tecniciRef.where("uid", "==", uid).limit(1).get();

        if (querySnapshot.empty) {
            logger.error(`ERRORE CRITICO: Nessun documento tecnico trovato in Firestore per l'UID: ${uid}.`);
        } else {
            const tecnicoDoc = querySnapshot.docs[0];
            logger.info(`Trovato documento tecnico: ${tecnicoDoc.id}. Aggiornamento di 'appAccess' a ${newState}...`);
            await tecnicoDoc.ref.update({ appAccess: newState });
            logger.info(`Documento Firestore ${tecnicoDoc.id} aggiornato con successo.`);
        }

        // 4. Aggiorna lo stato dell'utente in Firebase Authentication
        await auth.updateUser(uid, { disabled: !newState });
        logger.info(`Stato utente in Authentication per UID: ${uid} aggiornato. Disabilitato: ${!newState}`);

        const actionText = newState ? "abilitato" : "revocato";
        const message = `Accesso ${actionText} con successo per l'utente con UID: ${uid}.`;

        return { status: "success", message: message };

    } catch (error: any) {
        logger.error(`Fallimento nella gestione dell'accesso per UID ${uid}:`, error);

        if (error.code === "auth/user-not-found") {
            throw new HttpsError("not-found", `CRITICO: Nessun utente trovato in Authentication con UID: ${uid}. Impossibile procedere.`);
        }

        throw new HttpsError(
            "internal",
            `Si è verificato un errore interno: ${error.message}`
        );
    }
});
