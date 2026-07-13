
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// INIZIALIZZAZIONE
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const auth = admin.auth();
const db = admin.firestore();

/**
 * Funzione UNIFICATA e CORRETTA per la gestione utenti.
 * Utilizza ESCLUSIVAMENTE la collezione `admins` per la logica degli amministratori.
 */
export const amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data, context) => {
  // 1. CHECK PERMESSI: Unificato e corretto su collezione `admins`
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Autenticazione richiesta.");
  }
  try {
    const adminDoc = await db.collection("admins").doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError("permission-denied", "Azione consentita solo agli amministratori.");
    }
  } catch (error) {
     throw new functions.https.HttpsError("internal", "Errore durante la verifica dei permessi.", error);
  }

  const { action, uid, email, nome, telefono } = data;

  try {
    switch (action) {

      // --- CREAZIONE UTENTE --- (Logica invariata, ma più pulita)
      case "createUser": {
        if (!email || !nome || !telefono) {
          throw new functions.https.HttpsError("invalid-argument", "Email, nome e telefono sono richiesti.");
        }
        const newUserRecord = await auth.createUser({ email, displayName: nome, phoneNumber: telefono });
        await db.collection("utenti_master").doc(newUserRecord.uid).set({ nome, email, telefono });
        return { success: true, message: `Utente ${nome} creato.` };
      }

      // --- MODIFICA UTENTE --- (Logica corretta e unificata)
      case "updateUser": {
        if (!uid || !nome || !telefono) {
          throw new functions.https.HttpsError("invalid-argument", "UID, nome e telefono sono richiesti per l'aggiornamento.");
        }

        // Aggiorna Authentication
        await auth.updateUser(uid, { displayName: nome, phoneNumber: telefono });

        const dataToUpdate = { nome, telefono };

        // Aggiorna Firestore con una transazione per garantire coerenza
        await db.runTransaction(async (transaction) => {
          const userMasterRef = db.collection("utenti_master").doc(uid);
          const adminRef = db.collection("admins").doc(uid);

          // Aggiorna sempre la master list
          transaction.update(userMasterRef, dataToUpdate);

          // Se l'utente è un admin, aggiorna anche la collezione admins
          const adminDoc = await transaction.get(adminRef);
          if (adminDoc.exists) {
            transaction.update(adminRef, dataToUpdate);
          }
        });

        return { success: true, message: `Utente ${nome} aggiornato.` };
      }

      // --- ELIMINAZIONE UTENTE --- (Logica corretta e unificata)
      case "deleteUser": {
        if (!uid) {
          throw new functions.https.HttpsError("invalid-argument", "UID dell'utente richiesto per l'eliminazione.");
        }
        await auth.deleteUser(uid);
        
        // Elimina da tutte le possibili collezioni per pulizia definitiva
        await db.collection("utenti_master").doc(uid).delete();
        await db.collection("admins").doc(uid).delete();
        await db.collection("amministratori").doc(uid).delete(); // Pulizia finale della vecchia collezione

        return { success: true, message: "Utente eliminato con successo." };
      }

      // L'azione `setRole` è stata rimossa perché gestita dal frontend. Questo previene conflitti.

      default:
        throw new functions.https.HttpsError("invalid-argument", `Azione non valida o non riconosciuta: '${action}'.`);
    }
  } catch (error: any) {
    console.error(`ERRORE durante l'azione '${action}' sull'utente ${uid}:`, error);
    if (error instanceof functions.https.HttpsError) {
        throw error;
    }
    throw new functions.https.HttpsError("internal", error.message || "Si è verificato un errore interno catastrofico.");
  }
});
