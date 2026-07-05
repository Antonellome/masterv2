
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const auth = admin.auth();

export const amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data, context) => {
  // 1. Validazione dell'autenticazione e dei permessi di super-amministratore
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "La richiesta richiede autenticazione.");
  }
  const adminUser = await auth.getUser(context.auth.uid);
  const customClaims = adminUser.customClaims || {};
  // Solo un admin può gestire altri utenti.
  if (customClaims.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Autorizzazione negata. Solo gli amministratori possono gestire gli utenti.");
  }

  // 2. Validazione dei dati in ingresso
  const { uid, action, role } = data;
  if (!uid || !action || (action === 'setRole' && !role)) {
    throw new functions.https.HttpsError("invalid-argument", "Argomenti non validi. Fornire 'uid', 'action', ed eventualmente 'role'.");
  }

  try {
    // 3. Logica principale
    let targetUser = await auth.getUser(uid);
    let newClaims = targetUser.customClaims || {};

    if (action === 'setRole') {
        if (role === 'admin' || role === 'user') {
            newClaims.role = role;
        } else {
            throw new functions.https.HttpsError("invalid-argument", `Ruolo non valido: ${role}. Usare 'admin' o 'user'.`);
        }
    } else {
        throw new functions.https.HttpsError("invalid-argument", `Azione non valida: ${action}. Usare 'setRole'.`);
    }

    // Imposta i nuovi custom claims
    await auth.setCustomUserClaims(uid, newClaims);

    console.log(`Ruolo di ${targetUser.email} (UID: ${uid}) aggiornato a '${role}' da ${adminUser.email}`);

    return { success: true, message: `Ruolo di ${targetUser.displayName || uid} aggiornato a ${role}.` };

  } catch (error: any) {
    console.error(`Errore durante la gestione dell'utente ${uid}:`, error);
    throw new functions.https.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
  }
});
