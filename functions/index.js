
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Cloud Function Callable potenziata per la gestione completa degli utenti.
 */
exports.manageUsers = functions.region('europe-west1').https.onCall(async (data, context) => {
  const action = data.action;
  const uid = context.auth?.uid;

  // 1. Azione di auto-promozione: non richiede autenticazione da admin
  if (action === "promoteToAdmin") {
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "Devi essere loggato per auto-promuoverti.");
    }
    
    try {
      const listUsersResult = await admin.auth().listUsers(1000);
      const existingAdmin = listUsersResult.users.find(
        (userRecord) => userRecord.customClaims && userRecord.customClaims.role === "admin"
      );

      if (existingAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Un amministratore esiste già.");
      }

      await admin.auth().setCustomUserClaims(uid, { role: "admin" });
      return {
        status: "success",
        message: `Complimenti! L\'utente ${context.auth.token.email} è ora il primo amministratore.`,
      };
    } catch (error) {
      console.error("Errore durante la promozione ad admin:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }

  // 2. Protezione per tutte le altre azioni: Richiede il ruolo di ADMIN
  const isCallerAdmin = context.auth?.token?.role === 'admin';
  if (!isCallerAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Accesso negato. Questa operazione richiede privilegi di amministratore."
    );
  }

  // 3. Azioni riservate agli ADMIN
  switch (action) {
    case "listAll":
      try {
        const listUsersResult = await admin.auth().listUsers(1000);
        const users = listUsersResult.users.map(userRecord => ({
          uid: userRecord.uid,
          email: userRecord.email,
          role: userRecord.customClaims?.role || 'Nessuno',
          disabled: userRecord.disabled,
        }));
        return { users };
      } catch (error) {
        console.error("Errore nel listare gli utenti:", error);
        throw new functions.https.HttpsError("internal", "Errore durante il recupero degli utenti.");
      }

    case "setRole":
      try {
        const { uid: targetUid, newRole } = data.payload;
        if (!targetUid || !newRole) {
          throw new functions.https.HttpsError("invalid-argument", "UID utente e nuovo ruolo sono richiesti.");
        }
        await admin.auth().setCustomUserClaims(targetUid, { role: newRole });
        return { status: "success", message: `Ruolo aggiornato con successo per l'utente.` };
      } catch (error) {
        console.error("Errore nell'impostare il ruolo:", error);
        throw new functions.https.HttpsError("internal", "Errore durante l'aggiornamento del ruolo.");
      }

    default:
      throw new functions.https.HttpsError("invalid-argument", "L'azione richiesta non è valida.");
  }
});
