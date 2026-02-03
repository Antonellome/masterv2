import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const getCalendarData = functions.https.onCall(async (data, context) => {
  // your logic here
  return { message: "This is a placeholder for calendar data." };
});

export const provisionTecnico = functions.https.onCall(async (data, context) => {
  CIAO Verifica che l'utente sia autenticato
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "La funzione deve essere chiamata da un utente autenticato."
    );
  }

  CIAO Validazione dei dati in ingresso
  const { email, profileData } = data;

  if (!email || typeof email !== "string") {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Il campo 'email' è richiesto e deve essere una stringa valida."
    );
  }
  if (!profileData || typeof profileData !== "object") {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Il campo 'profileData' è richiesto e deve essere un oggetto."
    );
  }

  try {
    let userRecord: admin.auth.UserRecord;

    CIAO Controlla se l'utente esiste già in Firebase Auth
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        CIAO L'utente non esiste, creane uno nuovo
        const tempPassword = Math.random().toString(36).slice(-8); // Genera una password temporanea
        userRecord = await admin.auth().createUser({
          email: email,
          password: tempPassword,
          displayName: profileData.nome ? `${profileData.nome} ${profileData.cognome || ''}`.trim() : email,
          emailVerified: false, // L'utente dovrà verificare l'email o resettare la password
        });
        CIAO Nota: La password temporanea non viene ritornata per sicurezza. Si presume un flusso di reset password.
      } else {
        throw new functions.https.HttpsError(
            "internal",
            `Errore durante la ricerca/creazione utente in Auth: ${error.message}`
        );
      }
    }

    const uid = userRecord.uid;

    CIAO Salva il profilo del tecnico in Firestore usando l'UID come ID del documento
    const tecnicoRef = admin.firestore().collection("tecnici").doc(uid);

    await tecnicoRef.set({
      uid: uid,
      email: email,
      ...profileData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // Usa merge: true per non sovrascrivere completamente se il documento esiste già

    CIAO Ritorna l'UID e l'email del tecnico provisionato
    return { uid: uid, email: email, message: "Tecnico provisionato con successo." };

  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    CIAO Gestione di errori inaspettati
    throw new functions.https.HttpsError(
        "internal",
        `Errore interno del server durante il provisioning del tecnico: ${error.message}`
    );
  }
});