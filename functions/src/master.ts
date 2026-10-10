
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inizializza l'SDK di Admin una sola volta per evitare errori.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const europeWest6 = functions.region('europe-west6');

/**
 * Funzione Cloud unificata e definitiva per la gestione dei tecnici.
 * Garantisce la coerenza dei dati tra Firebase Authentication e Cloud Firestore,
 * gestendo anche i dati storici corrotti.
 */
export const master_gestisciTecnico = europeWest6.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }

  const { operation, data: payload } = data;

  try {
    switch (operation) {
      
      case 'create': {
        const { email, password, displayName, ...otherData } = payload;
        if (!email || !password) {
          throw new functions.https.HttpsError('invalid-argument', 'Email e password sono obbligatori per la creazione.');
        }

        // 1. Crea l'utente in Firebase Authentication
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: displayName || email,
          emailVerified: true, // Creato da admin, quindi verificato
          disabled: false,
        });
        functions.logger.info(`Nuovo utente Auth creato con UID: ${userRecord.uid}`);

        // 2. Prepara e crea il documento corrispondente in Firestore
        const newTecnicoData = {
          ...otherData,
          uid: userRecord.uid, // <-- PUNTO CHIAVE: Salva l'UID di Auth nel documento
          email,
          displayName: displayName || email,
          attivo: true, // Di default è attivo
          appAccess: true, // Di default ha accesso
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Usiamo l'UID di Auth come ID del documento per una coerenza 1:1
        const docRef = db.collection('tecnici').doc(userRecord.uid);
        await docRef.set(newTecnicoData);
        functions.logger.info(`Documento tecnico creato in Firestore con ID: ${userRecord.uid}`);

        return { success: true, id: userRecord.uid };
      }

      case 'update': {
        // Il payload DEVE contenere sia 'id' (docId) che 'uid' (authId)
        const { id, uid, ...updateData } = payload;

        if (!id || !uid) {
          throw new functions.https.HttpsError('invalid-argument', 'ID del documento (id) e ID di autenticazione (uid) sono entrambi obbligatori per l\'aggiornamento.');
        }

        // 1. Aggiorna l'utente in Firebase Authentication
        const { email, displayName } = updateData;
        await admin.auth().updateUser(uid, {
          email,
          displayName,
        });
        functions.logger.info(`Dati Auth del tecnico ${uid} aggiornati.`);

        // 2. Aggiorna il documento in Cloud Firestore
        const docRef = db.collection('tecnici').doc(id);
        const firestoreUpdateData = {
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await docRef.update(firestoreUpdateData);
        functions.logger.info(`Documento Firestore ${id} aggiornato.`);

        return { success: true, message: `Tecnico ${uid} aggiornato` };
      }

      case 'toggle-active': {
        const { id, attivo } = payload; // Il frontend passa 'id' (che è l'UID) e lo stato desiderato
        if (!id) {
          throw new functions.https.HttpsError('invalid-argument', 'UID del tecnico mancante per cambio stato.');
        }
        
        // 1. Aggiorna lo stato in Authentication
        await admin.auth().updateUser(id, { disabled: !attivo });
        
        // 2. Aggiorna lo stato nel documento Firestore
        // Assumiamo che l'ID del documento sia lo stesso dell'UID
        const docRef = db.collection('tecnici').doc(id);
        await docRef.update({ attivo, appAccess: attivo }); // Aggiorna entrambi i campi per coerenza

        functions.logger.info(`Stato di attivazione del tecnico ${id} impostato a ${attivo}.`);
        return { success: true, message: `Stato utente ${id} aggiornato` };
      }

      default:
        throw new functions.https.HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
    }
  } catch (error: any) {
    functions.logger.error(`ERRORE FATALE durante l'operazione '${operation}':`, error);
    throw new functions.https.HttpsError('internal', error.message, error);
  }
});


/**
 * Invia un link per il reset della password all'email di un tecnico.
 */
export const master_resetPasswordTecnico = europeWest6.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Richiesta non autenticata.');
    }
    const { email } = data;
    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'L\'indirizzo email è obbligatorio.');
    }
    try {
        await admin.auth().generatePasswordResetLink(email);
        functions.logger.info(`Link di reset password inviato a ${email}.`);
        return { success: true };
    } catch (error: any) {
        functions.logger.error(`Errore durante la generazione del link di reset per ${email}:`, error);
        if (error.code === 'auth/user-not-found') {
             throw new functions.https.HttpsError('not-found', 'Nessun utente trovato con questa email.');
        }
        throw new functions.https.HttpsError('internal', 'Errore durante l\'invio dell\'email di reset.');
    }
});
