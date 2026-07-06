
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Funzione per eliminare un tecnico (utente Auth e/o documento Firestore).
 * Verifica che il chiamante sia un amministratore.
 * È progettata per essere resiliente e pulire i record "orfani" di Firestore.
 */
export const eliminaTecnico = functions.region('europe-west1').https.onCall(async (data, context) => {
  // 1. Verifica dei permessi (CORRETTA)
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Questa funzione può essere chiamata solo da un amministratore.'
    );
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'UID del tecnico non fornito.'
    );
  }

  try {
    // 2. Tentativo di eliminazione dell'utente da Firebase Authentication.
    try {
      await admin.auth().deleteUser(uid);
      console.log(`Utente di autenticazione ${uid} eliminato con successo.`);
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        console.log(`L'utente di autenticazione ${uid} non è stato trovato. Si procederà con la pulizia di Firestore.`);
      } else {
        console.error(`Errore durante l'eliminazione dell'utente di autenticazione ${uid}, ma si tenterà comunque di pulire Firestore. Errore:`, authError);
      }
    }

    // 3. Eliminazione del documento da Firestore.
    const tecnicoRef = admin.firestore().collection('tecnici').doc(uid);
    await tecnicoRef.delete();
    console.log(`Documento Firestore 'tecnici/${uid}' eliminato con successo.`);

    return { message: `Operazione di eliminazione per il tecnico ${uid} completata.` };

  } catch (error: any) {
    console.error(`Errore generale durante l'eliminazione del tecnico ${uid}:`, error);
    throw new functions.https.HttpsError(
      'internal',
      `Si è verificato un errore imprevisto durante la pulizia del tecnico. Dettagli: ${error.message}`
    );
  }
});
