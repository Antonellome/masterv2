import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Inizializza l'SDK di Admin una sola volta
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Funzione V2 per creare o aggiornare un utente tecnico in Firebase Authentication
 * e aggiornare il documento corrispondente in Firestore.
 * NON invia email. L'invio è delegato al client.
 */
export const provisionTecnico = onCall({ region: "europe-west1" }, async (request) => {
  // 1. Autenticazione
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente amministratore autenticato.");
  }

  // 2. Validazione input
  const { email, profileData, tecnicoId } = request.data;

  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "Il campo 'email' è obbligatorio.");
  }
  if (!tecnicoId || typeof tecnicoId !== "string") {
    throw new HttpsError("invalid-argument", "Il campo 'tecnicoId' è obbligatorio.");
  }

  try {
    let userRecord: admin.auth.UserRecord;

    // 3. Creazione o recupero utente in Auth
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email: email,
          displayName: profileData.nome ? `${profileData.nome} ${profileData.cognome || ''}`.trim() : email,
          emailVerified: true, // Si assume che l'email sia valida
        });
      } else {
        // Rilancia altri errori di Auth
        throw new HttpsError("internal", `Errore di Firebase Auth: ${error.message}`);
      }
    }

    const uid = userRecord.uid;

    // 4. Impostazione Custom Claim (es. ruolo)
    await admin.auth().setCustomUserClaims(uid, { role: 'tecnico' });

    // 5. Aggiornamento documento in Firestore
    const tecnicoRef = admin.firestore().collection("tecnici").doc(tecnicoId);
    await tecnicoRef.update({
      uid: uid,
      email: email, // Assicura che l'email sia consistente
      accessoApp: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6. Successo: restituisce i dati essenziali al client
    return {
      uid: uid,
      email: email,
      message: "Provisioning del tecnico completato con successo. Il client può ora inviare l'email di accesso."
    };

  } catch (error: any) {
    // Gestione errori centralizzata
    if (error instanceof HttpsError) {
      throw error;
    }
    // Log dell'errore per il debug
    console.error("Errore imprevisto in provisionTecnico:", error);
    throw new HttpsError("internal", `Errore interno del server: ${error.message}`);
  }
});


/**
 * Funzione placeholder V2 per recuperare dati del calendario.
 */
export const getCalendarData = onCall({ region: "europe-west1" }, (request) => {
  console.log("Funzione 'getCalendarData' chiamata.");
  return { message: "Placeholder per i dati del calendario restituito con successo." };
});
