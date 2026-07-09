
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inizializza l'SDK di Admin se non è già stato fatto
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const auth = admin.auth();
const db = admin.firestore();

/**
 * Funzione centralizzata per la gestione degli utenti e degli amministratori.
 * Verifica che il chiamante sia un amministratore prima di eseguire qualsiasi azione.
 * Azioni supportate:
 * - createUser: Crea un nuovo utente in Firebase Auth e nella collezione 'utenti_master'.
 * - deleteUser: Elimina un utente da Firebase Auth e dalle collezioni Firestore.
 * - setRole: Promuove un utente ad admin o lo retrocede a utente normale,
 *            spostando il suo record tra le collezioni 'amministratori' e 'utenti_master'.
 */
export const amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data, context) => {
  // 1. Verifica che il chiamante sia un amministratore autenticato
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Autenticazione richiesta.");
  }
  
  try {
    const adminDoc = await db.collection("amministratori").doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError("permission-denied", "Solo gli amministratori possono eseguire questa azione.");
    }
  } catch (error) {
     throw new functions.https.HttpsError("internal", "Errore durante la verifica dei permessi.", error);
  }

  const { action, uid, email, nome, role } = data;

  try {
    switch (action) {
      // --- CREAZIONE DI UN NUOVO UTENTE ---
      case "createUser": {
        if (!email || !nome) {
          throw new functions.https.HttpsError("invalid-argument", "Email e nome sono richiesti per creare un utente.");
        }
        // Crea l'utente in Firebase Authentication
        const newUserRecord = await auth.createUser({ email, displayName: nome });
        // Aggiunge l'utente alla collezione degli utenti "normali"
        await db.collection("utenti_master").doc(newUserRecord.uid).set({ nome, email });
        return { success: true, message: `Utente ${nome} creato con successo.` };
      }

      // --- ELIMINAZIONE DI UN UTENTE ---
      case "deleteUser": {
        if (!uid) {
          throw new functions.https.HttpsError("invalid-argument", "UID dell'utente richiesto per l'eliminazione.");
        }
        // Elimina l'utente da Firebase Authentication
        await auth.deleteUser(uid);
        // Elimina l'utente da entrambe le possibili collezioni in Firestore
        await db.collection("amministratori").doc(uid).delete();
        await db.collection("utenti_master").doc(uid).delete();
        return { success: true, message: "Utente eliminato con successo." };
      }

      // --- IMPOSTAZIONE DEL RUOLO (PROMOZIONE/REVOCA) ---
      case "setRole": {
        if (!uid || !role) {
          throw new functions.https.HttpsError("invalid-argument", "UID e ruolo sono richiesti.");
        }
        
        // Trova i dati dell'utente (potrebbe essere in una delle due collezioni)
        let userData: { nome?: string; email?: string } = {};
        const adminDoc = await db.collection("amministratori").doc(uid).get();
        if (adminDoc.exists) {
            userData = adminDoc.data() as { nome: string, email: string };
        } else {
            const userDoc = await db.collection("utenti_master").doc(uid).get();
            if (userDoc.exists) {
                userData = userDoc.data() as { nome: string, email: string };
            }
        }
        
        // Se non troviamo l'utente da nessuna parte, cerchiamo in Auth
        if (!userData.email) {
            const authUser = await auth.getUser(uid);
            userData = { nome: authUser.displayName, email: authUser.email };
        }

        if (role === "admin") {
          // Promuovi ad Amministratore
          await db.collection("amministratori").doc(uid).set({ nome: userData.nome || 'N/A', email: userData.email || 'N/A' });
          await db.collection("utenti_master").doc(uid).delete();
          return { success: true, message: "Utente promosso ad amministratore." };
        } else if (role === "user") {
          // Retrocedi a Utente
          await db.collection("utenti_master").doc(uid).set({ nome: userData.nome || 'N/A', email: userData.email || 'N/A' });
          await db.collection("amministratori").doc(uid).delete();
          return { success: true, message: "Privilegi di amministratore revocati." };
        } else {
          throw new functions.https.HttpsError("invalid-argument", `Ruolo non valido: ${role}.`);
        }
      }

      default:
        throw new functions.https.HttpsError("invalid-argument", "Azione non valida.");
    }
  } catch (error: any) {
    console.error(`Errore durante l'azione '${action}' sull'utente ${uid}:`, error);
    // Restituisce un messaggio d'errore più specifico se disponibile
    if (error instanceof functions.https.HttpsError) {
        throw error;
    }
    throw new functions.https.HttpsError("internal", error.message || "Si è verificato un errore interno.");
  }
});
