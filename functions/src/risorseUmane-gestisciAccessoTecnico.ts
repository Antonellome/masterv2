
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// L'SDK di Admin è già inizializzato nel file index.ts principale

export const risorseUmane_gestisciAccessoTecnico = functions.region("europe-west1").https.onCall(async (data, context) => {
    // 1. CONTROLLO AUTENTICAZIONE E PERMESSI DA AMMINISTRATORE
    if (!context.auth || context.auth.token.role !== 'admin') {
      logger.error(
        `Tentativo non autorizzato a risorseUmane_gestisciAccessoTecnico. UID: ${context.auth?.uid}`
      );
      throw new functions.https.HttpsError(
        "permission-denied",
        "Accesso negato. Solo gli amministratori possono eseguire questa operazione."
      );
    }

    // 2. VALIDAZIONE DATI IN INGRESSO
    const { uid, action } = data;
    if (!uid || (action !== "enable" && action !== "disable")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Dati non validi. È necessario fornire 'uid' e 'action' (enable/disable)."
      );
    }

    logger.info(
      `Richiesta di ${action} per UID: ${uid} dall'admin: ${context.auth.token.email}`
    );

    try {
      // 3. LOGICA PRINCIPALE
      const newState = action === "enable";

      // Aggiorna lo stato in Firebase Authentication
      await admin.auth().updateUser(uid, { disabled: !newState });
      logger.info(`Stato utente in Auth aggiornato per UID: ${uid}`);

      // Aggiorna lo stato nel documento Firestore
      const tecnicoRef = admin.firestore().collection("tecnici").doc(uid);
      await tecnicoRef.update({ appAccess: newState });
      logger.info(`Stato documento in Firestore aggiornato per UID: ${uid}`);

      const actionText = newState ? "abilitato" : "revocato";
      const message = `Accesso ${actionText} con successo per l'utente con UID: ${uid}.`;

      return { status: "success", message: message };

    } catch (error: any) {
      logger.error(
        `Errore durante l'aggiornamento dell'accesso per UID ${uid}:`, error
      );

      if (error.code === "auth/user-not-found") {
          throw new functions.https.HttpsError("not-found", `Nessun utente trovato in Authentication con UID: ${uid}.`);
      }
       
      throw new functions.https.HttpsError(
        "internal",
        `Si è verificato un errore interno: ${error.message}`
      );
    }
  }
);
