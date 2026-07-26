
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

interface GestisciAccessoData {
    uid: string;
    action: 'enable' | 'disable';
}

export const risorseUmane_gestisciAccessoTecnico = functions.region("europe-west1").https.onCall(async (data: GestisciAccessoData, context: functions.https.CallableContext) => {
    // 1. Autenticazione e Autorizzazione
    if (!context.auth || context.auth.token.role !== 'admin') {
        logger.error(
            `Tentativo non autorizzato di gestire accesso. UID: ${context.auth?.uid || 'Nessuno'}`
        );
        throw new functions.https.HttpsError(
            "permission-denied",
            "Solo gli amministratori possono eseguire questa operazione."
        );
    }

    // 2. Validazione Input
    const { uid, action } = data;
    if (!uid || (action !== "enable" && action !== "disable")) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dati non validi. Fornire 'uid' e 'action' ('enable'/'disable')."
        );
    }

    logger.info(`Richiesta di ${action} per UID: ${uid} dall'admin: ${context.auth.token.email}`);

    const db = admin.firestore();
    const auth = admin.auth();
    const newState = action === "enable";

    try {
        // 3. Trova il documento del tecnico basandosi sul CAMPO 'uid', non sull'ID del documento.
        const tecniciRef = db.collection("tecnici");
        const querySnapshot = await tecniciRef.where("uid", "==", uid).limit(1).get();

        if (querySnapshot.empty) {
            logger.error(`ERRORE CRITICO: Nessun documento tecnico trovato in Firestore per l'UID: ${uid}. L'utente esiste in Auth ma non nel DB.`);
            // Nonostante l'errore nel DB, procediamo con l'aggiornamento in Auth per mantenere la coerenza con la richiesta.
            // Potrebbe essere necessario un intervento manuale per allineare Firestore.
        } else {
            const tecnicoDoc = querySnapshot.docs[0];
            logger.info(`Trovato documento tecnico: ${tecnicoDoc.id} per UID: ${uid}. Aggiornamento di 'appAccess' a ${newState}...`);
            // Aggiorna il documento corretto in Firestore
            await tecnicoDoc.ref.update({ appAccess: newState });
            logger.info(`Documento Firestore ${tecnicoDoc.id} aggiornato con successo.`);
        }

        // 4. Aggiorna lo stato dell'utente in Firebase Authentication
        await auth.updateUser(uid, { disabled: !newState });
        logger.info(`Stato utente in Authentication aggiornato per UID: ${uid}. Disabilitato: ${!newState}`);

        const actionText = newState ? "abilitato" : "revocato";
        const message = `Accesso ${actionText} con successo per l'utente con UID: ${uid}.`;

        return { status: "success", message: message };

    } catch (error: any) {
        logger.error(`Fallimento nella gestione dell'accesso per UID ${uid}:`, error);

        if (error.code === "auth/user-not-found") {
            throw new functions.https.HttpsError("not-found", `CRITICO: Nessun utente trovato in Authentication con UID: ${uid}. Impossibile procedere.`);
        }

        throw new functions.https.HttpsError(
            "internal",
            `Si è verificato un errore interno: ${error.message}`
        );
    }
});
