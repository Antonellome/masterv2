
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Assicurati che admin sia inizializzato
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

export const risorseUmane_gestisciAccessoTecnico = functions.region("europe-west1").https.onCall(async (data, context) => {
  // 1. Validazione dell'autenticazione e dei permessi di amministratore
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "La richiesta richiede autenticazione.");
  }
  const adminUser = await auth.getUser(context.auth.uid);
  const customClaims = adminUser.customClaims || {};
  if (customClaims.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo un amministratore può gestire l'accesso dei tecnici.");
  }

  // 2. Validazione dei dati in ingresso
  const { uid, action } = data;
  if (!uid || (action !== "enable" && action !== "disable")) {
    throw new functions.https.HttpsError("invalid-argument", "Argomenti non validi. Fornire 'uid' e 'action' ('enable'/'disable').");
  }

  try {
    // 3. Logica principale
    const targetUser = await auth.getUser(uid);
    const tecnicoRef = db.collection("tecnici").doc(uid);

    const newState = action === "enable";

    // Aggiorna lo stato in Firebase Authentication
    await auth.updateUser(uid, { disabled: !newState });

    // Aggiorna lo stato in Firestore
    await tecnicoRef.update({ appAccess: newState });

    const actionText = newState ? "abilitato" : "revocato";
    console.log(`Accesso ${actionText} per l'utente ${targetUser.displayName || targetUser.email} (UID: ${uid}) da parte dell'admin ${adminUser.email}`);

    return { success: true, message: `Accesso ${actionText} con successo per ${targetUser.displayName || uid}.` };

  } catch (error: any) {
    console.error(`Errore durante la gestione dell'accesso per l'UID ${uid}:`, error);
    // Controlla se l'utente non esiste in Firestore e fornisce un messaggio specifico
    if (error.code === 5) { // Codice per NOT_FOUND in gRPC
        throw new functions.https.HttpsError("not-found", `Nessun tecnico trovato in Firestore con UID: ${uid}. Impossibile aggiornare il documento.`);
    }
    throw new functions.https.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
  }
});

