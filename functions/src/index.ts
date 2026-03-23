// Force redeploy: 2026-03-23
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

export const manageUsers = onCall({ region: "europe-west1" }, async (request) => {
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError("permission-denied", "Richiesta non autorizzata. Privilegi di Amministratore richiesti.");
  }

  const { action, payload } = request.data;
  const callingUid = request.auth.uid;

  switch (action) {
    case 'list': { // Rinominato da listAll
      try {
        const userRecords = await admin.auth().listUsers(1000);
        let users = userRecords.users.map(user => ({
          uid: user.uid,
          email: user.email || 'N/A',
          role: user.customClaims?.role || 'Nessuno',
          disabled: user.disabled,
        }));

        // --- NUOVA LOGICA DI FILTRAGGIO SERVER-SIDE ---
        if (payload?.role) {
          if (payload.role === '!tecnico') {
            users = users.filter(user => user.role !== 'tecnico');
          } else {
            users = users.filter(user => user.role === payload.role);
          }
        }

        return { users };
      } catch (error) {
        console.error("Errore nel recuperare la lista utenti:", error);
        throw new HttpsError("internal", "Impossibile recuperare la lista utenti.");
      }
    }

    case 'setRole': {
      const { uid, newRole } = payload;
      if (!uid || !['admin', 'tecnico', 'Nessuno'].includes(newRole)) {
        throw new HttpsError("invalid-argument", "Payload non valido. 'uid' e 'newRole' (admin, tecnico, Nessuno) sono obbligatori.");
      }
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

    default:
      throw new HttpsError("invalid-argument", `Azione '${action}' non riconosciuta.`);
  }
});

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
