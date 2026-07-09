
// Questo script serve per popolare la collezione 'amministratori' con un set iniziale di UID.
// Va eseguito una sola volta, o ogni volta che si vuole resettare la lista degli amministratori iniziali.

const admin = require('firebase-admin');

// --- CONFIGURAZIONE ---
// Assicurati che il file 'serviceAccountKey.json' sia presente nella stessa cartella
// e che contenga le credenziali corrette per il tuo progetto Firebase.
const serviceAccount = require('./serviceAccountKey.json');

// Lista degli UID degli utenti da promuovere ad amministratori
const adminUIDs = [
    '8S3rTOvCo5avg4aT0dHuY2xtF5L2',
    'AORhx8VssKOmfSTJUT2p0fTzJqs2',
    'D3zUDDq01jM1tMO2iKzGeCeCpoD2',
    'LcN4wz9g73g8jN7W7z44I4gqK9c2',
    'QJ52S8z6rpP6CmBw5gTz3d3L1B42',
    'h6G6GjZ7v1aA9QzB4lF2w1X3N5c2',
    'muuM7oM9zZg3A0Xl0f8H2k3k4nS2',
    'zG6Nf5S9p1j3tF8w7L4e2bA3vDc2'
];
// ----------------------

// Inizializzazione dell'app Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedAdmins() {
  console.log('Inizio del seeding degli amministratori...');

  const batch = db.batch();
  let count = 0;

  for (const uid of adminUIDs) {
    const userRef = db.collection('amministratori').doc(uid);
    
    // Prima, prova a recuperare le informazioni dell'utente da Firebase Auth
    let nome = 'N/A';
    let email = 'N/A';
    try {
        const userRecord = await admin.auth().getUser(uid);
        nome = userRecord.displayName || 'N/A';
        email = userRecord.email || 'N/A';
        console.log(`Trovato utente in Auth: ${nome} (${email})`);
    } catch (error) {
        console.warn(`ATTENZIONE: UID '${uid}' non trovato in Firebase Authentication. Verrà aggiunto a Firestore con dati segnaposto.`);
    }

    // Aggiungi l'operazione al batch
    batch.set(userRef, { nome, email });
    count++;
  }

  try {
    await batch.commit();
    console.log(`
    --------------------------------------------------
    SUCCESSO!
    ${count} utenti sono stati aggiunti alla collezione 'amministratori' in Firestore.
    Questi utenti ora dispongono di privilegi di amministratore.
    --------------------------------------------------
    `);
  } catch (error) {
    console.error(`
    --------------------------------------------------
    ERRORE DURANTE IL SEEDING:
    `, error, `
    --------------------------------------------------
    `);
  }
}

// Esegui lo script
seedAdmins();
