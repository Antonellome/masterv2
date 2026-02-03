import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const getCalendarData = functions.https.onCall(async (data, context) => {
  // your logic here
  return { message: "This is a placeholder for calendar data." };
});

export const provisionTecnico = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "La funzione deve essere chiamata da un utente autenticato."
    );
  }

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

    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) { // Modified from catch (error: any)
      if ((error as any).code === 'auth/user-not-found') { // Cast error to any for code property
        const tempPassword = Math.random().toString(36).slice(-8); // Genera una password temporanea
        userRecord = await admin.auth().createUser({
          email: email,
          password: tempPassword,
          displayName: profileData.nome ? `${profileData.nome} ${profileData.cognome || ''}`.trim() : email,
          emailVerified: false, // L'utente dovrà verificare l'email o resettare la password
        });
        // Nota: La password temporanea non viene ritornata per sicurezza. Si presume un flusso di reset password.
      } else {
        throw new functions.https.HttpsError(
            "internal",
            `Errore durante la ricerca/creazione utente in Auth: ${(error as any).message}` // Cast error to any for message property
        );
      }
    }

    const uid = userRecord.uid;

    const tecnicoRef = admin.firestore().collection("tecnici").doc(uid);

    await tecnicoRef.set({
      uid: uid,
      email: email,
      ...profileData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // Usa merge: true per non sovrascrivere completamente se il documento esiste già

    return { uid: uid, email: email, message: "Tecnico provisionato con successo." };

  } catch (error) { // Modified from catch (error: any)
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Gestione di errori inaspettati
    throw new functions.https.HttpsError(
        "internal",
        `Errore interno del server durante il provisioning del tecnico: ${(error as any).message}` // Cast error to any for message property
    );
  }
});