import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Inizializza l'SDK di Firebase Admin una sola volta all'avvio.
admin.initializeApp();

// --- Funzione 1: L' "INTERFONO" (Gestione Utenti su Richiesta) ---

/**
 * Gestisce le operazioni sugli utenti richieste dall'app Master.
 * Richiede autenticazione come 'admin' per tutte le operazioni.
 * Agisce come dispatcher in base all'azione richiesta.
 */
export const manageUsers = onCall({ region: "europe-west1" }, async (request) => {
  // 1. CONTROLLO DI SICUREZZA FONDAMENTALE
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError("permission-denied", "Richiesta non autorizzata. Privilegi di Amministratore richiesti.");
  }

  const { action, payload } = request.data;
  const callingUid = request.auth.uid; // UID dell'admin che esegue l'operazione

  switch (action) {

    // AZIONE: Elencare tutti gli utenti
    case 'listAll': {
      try {
        const userRecords = await admin.auth().listUsers(1000);
        const users = userRecords.users.map(user => ({
          uid: user.uid,
          email: user.email || 'N/A',
          role: user.customClaims?.role || 'Nessuno',
          disabled: user.disabled,
        }));
        return { users };
      } catch (error) {
        console.error("Errore nel recuperare la lista utenti:", error);
        throw new HttpsError("internal", "Impossibile recuperare la lista utenti.");
      }
    }

    // AZIONE: Impostare un ruolo a un utente (Admin o Tecnico)
    case 'setRole': {
      const { uid, newRole } = payload;
      if (!uid || !newRole) {
        throw new HttpsError("invalid-argument", "Payload non valido. 'uid' e 'newRole' sono obbligatori.");
      }
      // Un admin non può rimuovere il proprio ruolo per errore
      if (callingUid === uid && newRole !== 'admin') {
        throw new HttpsError("failed-precondition", "Un amministratore non può rimuovere il proprio ruolo.");
      }
      try {
        await admin.auth().setCustomUserClaims(uid, { role: newRole });
        return { message: `Ruolo per l'utente ${uid} aggiornato a ${newRole}.` };
      } catch (error) {
        console.error(`Errore nell'impostare il ruolo per ${uid}:`, error);
        throw new HttpsError("internal", "Errore durante l'aggiornamento del ruolo.");
      }
    }

    // AZIONE: Creare un utente (per la pagina "Accesso App" dei tecnici)
    case 'createUser': {
      const { email, password } = payload;
      if (!email || !password) {
          throw new HttpsError("invalid-argument", "Email e password sono obbligatori per creare un utente.");
      }
      try {
          const userRecord = await admin.auth().createUser({ email, password });
          return { uid: userRecord.uid, message: `Utente ${email} creato con successo.` };
      } catch (error: unknown) { // Corretto: da 'any' a 'unknown'
          console.error(`Errore nella creazione dell'utente ${email}:`, error);
          // Fornisce un messaggio d'errore più utile al frontend
          const firebaseError = error as { code?: string }; // Type assertion
          if (firebaseError.code === 'auth/email-already-exists') {
              throw new HttpsError('already-exists', 'L\'indirizzo email è già in uso da un altro account.');
          }
          throw new HttpsError("internal", "Impossibile creare l'utente.");
      }
    }

    default:
      throw new HttpsError("invalid-argument", `Azione '${action}' non riconosciuta.`);
  }
});


// --- Funzione 2: Il "CAMPANELLO" (Sincronizzazione Automatica) ---

/**
 * Si attiva quando il manifest di sincronizzazione viene aggiornato.
 * Invia una notifica push silenziosa ai dispositivi per avviare il sync.
 */
export const syncDataTrigger = onDocumentUpdated(
    { document: "config/syncManifest", region: "europe-west1" }, 
    async (event) => {

    console.log("Sync Manifest aggiornato. Trigger per la notifica PUSH attivato.");
    const newData = event.data?.after.data(); 

    console.log("Nuovo stato del manifest:", newData);

    // TODO: Implementare la logica di invio notifica PUSH silenziosa (FCM)

    console.log("LOGICA PUSH NON ANCORA IMPLEMENTATA.");

    return Promise.resolve();
});
