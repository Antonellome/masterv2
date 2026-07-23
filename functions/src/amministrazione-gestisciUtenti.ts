
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

interface GestisciUtentiData {
    uid: string;
    role: 'admin' | 'tecnico';
}

export const amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data: GestisciUtentiData, context: functions.https.CallableContext) => {
    // 1. CONTROLLO AUTENTICAZIONE E PERMESSI
    if (context.auth?.token.role !== 'admin') {
        logger.error(
            `Tentativo non autorizzato. UID: ${context.auth?.uid || 'Nessuno'}`
        );
        throw new functions.https.HttpsError(
            "permission-denied",
            "Solo gli amministratori possono gestire i ruoli."
        );
    }

    // 2. VALIDAZIONE DATI
    const { uid, role } = data;
    if (!uid || (role !== 'admin' && role !== 'tecnico')) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dati non validi. Fornire 'uid' e 'role' ('admin' o 'tecnico')."
        );
    }

    logger.info(`Richiesta di impostare il ruolo '${role}' per UID: ${uid} dall'admin: ${context.auth.token.email}`);

    try {
        // 3. IMPOSTA CUSTOM CLAIM
        await admin.auth().setCustomUserClaims(uid, { role: role });

        // Opzionale: Aggiorna anche un campo nel documento utente in Firestore
        await admin.firestore().collection('tecnici').doc(uid).update({
            role: role,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info(`Ruolo '${role}' impostato con successo per UID: ${uid}`);
        return { status: "success", message: `Ruolo '${role}' aggiornato per l'utente ${uid}.` };

    } catch (error: any) {
        logger.error(`Errore nell'impostare il ruolo per UID ${uid}:`, error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError("not-found", `Nessun utente trovato in Authentication con UID: ${uid}.`);
        }
        throw new functions.https.HttpsError(
            "internal",
            `Errore interno durante l'aggiornamento del ruolo. ${error.message}`
        );
    }
});
