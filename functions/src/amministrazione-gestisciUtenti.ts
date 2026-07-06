
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const auth = admin.auth();

export const amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data, context) => {
  // 1. Validazione dell'autenticazione e dei permessi
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "La richiesta richiede autenticazione.");
  }
  const adminUser = await auth.getUser(context.auth.uid);
  const customClaims = adminUser.customClaims || {};
  if (customClaims.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Autorizzazione negata. Solo gli amministratori possono gestire gli utenti.");
  }

  // 2. Validazione dei dati in ingresso
  const { uid, action, role } = data;
  if (!uid || !action || (action === 'setRole' && !role)) {
    throw new functions.https.HttpsError("invalid-argument", "Argomenti non validi. Fornire 'uid', 'action', e 'role'.");
  }

  try {
    // 3. Logica Principale CORRETTA
    const targetUser = await auth.getUser(uid);
    let newClaims = {}; // <<<< LA CORREZIONE È QUI. CREA UN OGGETTO VUOTO.

    if (action === 'setRole') {
        if (role === 'admin' || role === 'user') {
            // Assegna solo il ruolo richiesto, eliminando ogni altro permesso vecchio.
            newClaims = { role: role };
        } else {
            throw new functions.https.HttpsError("invalid-argument", `Ruolo non valido: ${role}. Usare 'admin' o 'user'.`);
        }
    } else {
        throw new functions.https.HttpsError("invalid-argument", `Azione non valida: ${action}. Usare 'setRole'.`);
    }

    // Imposta i nuovi custom claims, sovrascrivendo completamente i vecchi.
    await auth.setCustomUserClaims(uid, newClaims);

    console.log(`Ruolo di ${targetUser.email} (UID: ${uid}) aggiornato a '${role}' da ${adminUser.email}`);

    return { success: true, message: `Ruolo di ${targetUser.displayName || uid} aggiornato a ${role}.` };

  } catch (error: any) {
    console.error(`Errore durante la gestione dell'utente ${uid}:`, error);
    throw new functions.https.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
  }
});
