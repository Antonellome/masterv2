
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

const europeWest6Options = {
  region: "europe-west6",
};

export const master_gestisciTecnico = onCall(europeWest6Options, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }
  const { operation, data: payload } = request.data;
  try {
    switch (operation) {
      case 'create': {
        const { email, password, displayName, ...otherData } = payload;
        if (!email || !password) {
          throw new HttpsError('invalid-argument', 'Email e password sono obbligatori.');
        }
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: displayName || email,
          emailVerified: true,
          disabled: false,
        });
        logger.info(`Nuovo utente Auth creato con UID: ${userRecord.uid}`);
        const newTecnicoData = { ...otherData, uid: userRecord.uid, email, displayName: displayName || email, attivo: true, appAccess: true, createdAt: admin.firestore.FieldValue.serverTimestamp() };
        const docRef = db.collection('tecnici').doc(userRecord.uid);
        await docRef.set(newTecnicoData);
        logger.info(`Documento tecnico creato in Firestore con ID: ${userRecord.uid}`);
        return { success: true, id: userRecord.uid };
      }
      case 'update': {
        const { id, uid, ...updateData } = payload;
        if (!id || !uid) {
          throw new HttpsError('invalid-argument', 'ID documento e UID sono obbligatori.');
        }
        const { email, displayName } = updateData;
        await admin.auth().updateUser(uid, { email, displayName });
        logger.info(`Dati Auth del tecnico ${uid} aggiornati.`);
        const docRef = db.collection('tecnici').doc(id);
        const firestoreUpdateData = { ...updateData, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        await docRef.update(firestoreUpdateData);
        logger.info(`Documento Firestore ${id} aggiornato.`);
        return { success: true, message: `Tecnico ${uid} aggiornato` };
      }
      case 'toggle-active': {
        const { id, attivo } = payload;
        if (!id) {
          throw new HttpsError('invalid-argument', 'UID del tecnico mancante.');
        }
        await admin.auth().updateUser(id, { disabled: !attivo });
        const docRef = db.collection('tecnici').doc(id);
        await docRef.update({ attivo, appAccess: attivo });
        logger.info(`Stato di attivazione del tecnico ${id} impostato a ${attivo}.`);
        return { success: true, message: `Stato utente ${id} aggiornato` };
      }
      default:
        throw new HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
    }
  } catch (error: any) {
    logger.error(`ERRORE FATALE in master_gestisciTecnico, op: '${operation}': ${JSON.stringify(error)}`);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message, error);
  }
});

export const master_resetPasswordTecnico = onCall(europeWest6Options, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }
  const { email } = request.data;
  if (!email) {
    throw new HttpsError('invalid-argument', "L'indirizzo email è obbligatorio.");
  }
  try {
    await admin.auth().generatePasswordResetLink(email);
    logger.info(`Link di reset password inviato a ${email}.`);
    return { success: true };
  } catch (error: any) {
    logger.error(`Errore durante la generazione del link di reset per ${email}: ${JSON.stringify(error)}`);
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Nessun utente trovato con questa email.');
    }
    throw new HttpsError('internal', "Errore durante l'invio dell'email di reset.");
  }
});

export const admin_getAllUsers = onCall(europeWest6Options, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }
  const { pageToken, maxResults = 100 } = request.data;
  try {
    const userRecords = await admin.auth().listUsers(maxResults, pageToken);
    const users = userRecords.users.map(u => ({ uid: u.uid, email: u.email, displayName: u.displayName, disabled: u.disabled, customClaims: u.customClaims }));
    return { success: true, users, nextPageToken: userRecords.pageToken };
  } catch (error: any) {
    logger.error(`Errore durante il recupero degli utenti: ${JSON.stringify(error)}`);
    throw new HttpsError('internal', "Impossibile recuperare l'elenco degli utenti.");
  }
});

export const amministrazione_gestisciUtenti = onCall(europeWest6Options, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }
  const { operation } = request.data;
  try {
    switch (operation) {
      case 'create':
      case 'update':
      case 'delete':
        throw new HttpsError('unimplemented', `L'operazione '${operation}' non è ancora stata implementata.`);
      default:
        throw new HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
    }
  } catch (error: any) {
    logger.error(`Errore in amministrazione_gestisciUtenti, op: '${operation}': ${JSON.stringify(error)}`);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Errore interno del server.');
  }
});

export const master_gestisciAnagrafica = onCall(europeWest6Options, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }
  const { operation, data: payload, anagraficaId } = request.data;
  try {
    const anagraficaRef = db.collection('anagrafiche');
    switch (operation) {
      case 'create': {
        const docRef = await anagraficaRef.add({ ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { success: true, id: docRef.id };
      }
      case 'update': {
        if (!anagraficaId) throw new HttpsError('invalid-argument', 'anagraficaId mancante.');
        await anagraficaRef.doc(anagraficaId).update({ ...payload, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { success: true, id: anagraficaId };
      }
      case 'delete': {
        if (!anagraficaId) throw new HttpsError('invalid-argument', 'anagraficaId mancante.');
        await anagraficaRef.doc(anagraficaId).delete();
        return { success: true, id: anagraficaId };
      }
      default:
        throw new HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
    }
  } catch (error: any) {
    logger.error(`Errore in master_gestisciAnagrafica, op: '${operation}': ${JSON.stringify(error)}`);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Errore interno del server.');
  }
});

export const master_gestisciRapportino = onCall(europeWest6Options, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }
  const { operation } = request.data;
  try {
    switch (operation) {
      case 'create':
      case 'update':
      case 'delete':
        throw new HttpsError('unimplemented', `L'operazione '${operation}' non è ancora stata implementata.`);
      default:
        throw new HttpsError('unimplemented', `Operazione '${operation}' non supportata.`);
    }
  } catch (error: any) {
    logger.error(`Errore in master_gestisciRapportino, op: '${operation}': ${JSON.stringify(error)}`);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Errore interno del server.');
  }
});

export const master_inviaNotifichePush = onCall(europeWest6Options, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }
  const { token, topic, title, body, data } = request.data.notification;
  if (!title || !body || (!token && !topic)) {
    throw new HttpsError('invalid-argument', 'token/topic, titolo e body sono obbligatori.');
  }
  const payload: admin.messaging.Message = { notification: { title, body }, data: data || {}, ...(token ? { token } : { topic: topic! }) };
  try {
    const response = await admin.messaging().send(payload);
    logger.info(`Notifica inviata con successo: ${response}`);
    return { success: true, messageId: response };
  } catch (error: any) {
    logger.error(`Errore durante l'invio della notifica: ${JSON.stringify(error)}`);
    throw new HttpsError('internal', "Impossibile inviare la notifica.");
  }
});

export const deleteNotificationBatch = onCall(europeWest6Options, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Richiesta non autenticata.');
  }
  const { collectionName, docIds } = request.data;
  if (!collectionName || !Array.isArray(docIds) || docIds.length === 0) {
    throw new HttpsError('invalid-argument', 'collectionName e un array di docIds sono richiesti.');
  }
  const batch = db.batch();
  docIds.forEach(id => {
    const docRef = db.collection(collectionName).doc(id);
    batch.delete(docRef);
  });
  try {
    await batch.commit();
    logger.info(`Cancellati ${docIds.length} documenti da ${collectionName}.`);
    return { success: true };
  } catch (error: any) {
    logger.error(`Errore durante la cancellazione batch: ${JSON.stringify(error)}`);
    throw new HttpsError('internal', 'Impossibile completare la cancellazione batch.');
  }
});
