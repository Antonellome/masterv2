
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * FUNZIONE DI RIPARAZIONE DEFINITIVA E MONOUSO PER ANTONIO SCUDERI.
 * Hardcoded per l'email scuderiantonio@proton.me.
 * Imposta nome, livello staff e admin.
 */
export const riparaScuderi = functions.region("europe-west1").https.onCall(async (data: any, context: functions.https.CallableContext) => {
    const email = "scuderiantonio@proton.me";
    const nomeCorretto = "Antonio Scuderi";

    logger.info(`--- INIZIO RIPARAZIONE DEFINITIVA PER ${email} ---`);

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const { uid } = userRecord;
        const currentClaims = userRecord.customClaims || {};

        logger.info("Step 1: Imposto i Custom Claims corretti...");
        await admin.auth().setCustomUserClaims(uid, {
            ...currentClaims,
            livello: 'staff',
            admin: true
        });
        logger.info("Step 1: Custom Claims impostati: { livello: 'staff', admin: true }");

        logger.info("Step 2: Aggiorno il Display Name...");
        await admin.auth().updateUser(uid, {
            displayName: nomeCorretto
        });
        logger.info(`Step 2: Display Name aggiornato a "${nomeCorretto}"`);

        logger.info(`--- RIPARAZIONE COMPLETATA CON SUCCESSO PER ${uid} ---`);

        return {
            status: "success",
            message: `L'utente ${email} è stato riparato con successo. Nome: ${nomeCorretto}, Claims: { livello: 'staff', admin: true }`,
        };
    } catch (error: any) {
        logger.error(`!!! ERRORE CRITICO DURANTE LA RIPARAZIONE DI ${email}:`, error);
        throw new functions.https.HttpsError("internal", `Errore durante la riparazione: ${error.message}`);
    }
});
