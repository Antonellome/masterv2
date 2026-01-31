import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v1 as firestore } from "@google-cloud/firestore";

admin.initializeApp();
const db = admin.firestore();
const client = new firestore.FirestoreAdminClient();

// Sostituisci con l'ID del tuo progetto e il bucket GCS
const projectId = process.env.GCP_PROJECT || 'riso-project-app';
const bucket = `gs://${projectId}-backups`;

exports.scheduledFirestoreExport = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const databaseName = client.databasePath(projectId, "(default)");

    try {
      const responses = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        collectionIds: [],
      });
      const response = responses[0];
      console.log(`Operazione di export avviata: ${response["name"]}`);
      return null;
    } catch (err) {
      console.error(err);
      throw new Error("L'operazione di export è fallita");
    }
  });

exports.recordSignIn = functions.auth.user().onFinalize(async (user) => {
  try {
    const { uid } = user;
    
    // Cerca il tecnico corrispondente in base all'UID
    const querySnapshot = await db.collection('tecnici').where('uid', '==', uid).limit(1).get();

    if (querySnapshot.empty) {
      console.log(`Nessun tecnico trovato per l'UID: ${uid}. Potrebbe essere un amministratore o un utente non tecnico.`);
      return null;
    }

    const tecnicoDoc = querySnapshot.docs[0];
    
    // Controlla se il campo lastSignInTime esiste già per evitare aggiornamenti non necessari
    // Se vuoi tracciare ogni accesso, puoi rimuovere questa condizione
    if (tecnicoDoc.exists && !tecnicoDoc.data().lastSignInTime) {
      await tecnicoDoc.ref.update({
        lastSignInTime: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Primo accesso registrato per il tecnico ${tecnicoDoc.id} (UID: ${uid})`);
    } else {
      console.log(`Accesso successivo per il tecnico ${tecnicoDoc.id}. Nessun aggiornamento necessario.`);
    }

    return null;

  } catch (error) {
    console.error("Errore durante la registrazione dell'accesso:", error);
    return null;
  }
});
