import admin from 'firebase-admin';

// Inizializza l'SDK di Firebase Admin
try {
  admin.initializeApp();
} catch {
  admin.app(); // L'app è già inizializzata
}

const db = admin.firestore();

async function migrateDocument(docId) {
  const docRef = db.collection('tipiGiornata').doc(docId);

  try {
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`Documento con ID ${docId} non trovato.`);
      return;
    }

    const data = doc.data();

    if (data.label && !data.nome) {
      console.log(`Migrazione del documento ${docId}:`);
      console.log(`  - Valore 'label': ${data.label}`);

      await docRef.update({
        nome: data.label,
        label: admin.firestore.FieldValue.delete() // Rimuove il campo 'label'
      });

      console.log(`  - Campo 'nome' creato.`);
      console.log(`  - Campo 'label' rimosso.`);
      console.log(`Migrazione completata per ${docId}.`);
    } else {
      console.log(`Il documento ${docId} non richiede migrazione (ha già 'nome' o manca 'label').`);
    }
  } catch (error) {
    console.error(`Errore durante la migrazione del documento ${docId}:`, error);
  }
}

// --- ESECUZIONE --- 
async function runMigration() {
    await migrateDocument('d7YgCXdG1gAkGDHgPJQr'); // Ordinaria
    await migrateDocument('ibenzUt4ryryjHDWSb03'); // Straordinaria
    console.log('Processo di migrazione terminato.');
}

runMigration();
