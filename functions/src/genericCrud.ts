import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Funzione di utility per verificare i permessi di amministratore
const checkAdmin = async (uid: string) => {
  const user = await admin.auth().getUser(uid);
  return user.customClaims?.admin === true;
};

// Funzione generica per creare un documento
export const createDocument = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const isAdmin = await checkAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to create a document.');
  }

  const { collection, docData } = data;

  try {
    const docRef = await admin.firestore().collection(collection).add(docData);
    return { id: docRef.id };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Could not create document.', error);
  }
});

// Funzione generica per aggiornare un documento
export const updateDocument = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be in called while authenticated.');
  }

  const isAdmin = await checkAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to update a document.');
  }

  const { collection, docId, docData } = data;

  try {
    await admin.firestore().collection(collection).doc(docId).update(docData);
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Could not update document.', error);
  }
});

// Funzione generica per eliminare un documento
export const deleteDocument = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const isAdmin = await checkAdmin(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to delete a document.');
  }

  const { collection, docId } = data;

  try {
    await admin.firestore().collection(collection).doc(docId).delete();
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Could not delete document.', error);
  }
});
