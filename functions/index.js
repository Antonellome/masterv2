// File: functions/index.js (o il vostro file principale delle cloud functions)
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inizializza l'app admin solo se non è già stato fatto
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.provisionTecnico = functions.region('europe-west1').https.onCall(async (data, context) => {
  // Controllo di sicurezza: solo gli utenti autenticati possono chiamare questa funzione.
  // Per maggiore sicurezza, dovreste verificare se l'utente è un amministratore.
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Autenticazione richiesta.");
  }

  const { email, ...profilo } = data;
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "L'indirizzo email è un campo obbligatorio.");
  }

  try {
    let userRecord;
    // Controlla se l'utente esiste già per evitare di sovrascriverlo o creare duplicati.
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // L'utente non esiste: crealo nel sistema di Autenticazione.
        userRecord = await admin.auth().createUser({ email: email });
      } else {
        // Altri errori di autenticazione (es. email malformata)
        throw error;
      }
    }
    
    const uid = userRecord.uid;

    // Crea il documento nella collezione 'tecnici' USANDO L'UID COME ID DEL DOCUMENTO.
    const docRef = admin.firestore().collection("tecnici").doc(uid);
    await docRef.set({
      ...profilo,
      uid: uid, // Salva l'UID anche all'interno del documento.
      email: email,
      attivo: true,
      accessoApp: true,
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // Usiamo 'merge: true' per non sovrascrivere dati se il documento già esiste.

    // Ritorna l'UID e l'email al client per conferma.
    return { uid: uid, email: email };
  } catch (error) {
    console.error("Errore critico in provisionTecnico:", error);
    throw new functions.https.HttpsError("internal", "Impossibile completare l'operazione sul server.");
  }
});
