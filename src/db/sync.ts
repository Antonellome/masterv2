
import { Dexie } from 'dexie';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { db as dexieDb } from '@/db/db';
import { ANAGRAFICHE_CONFIG } from '@/config/anagrafiche.config';

/**
 * Sincronizza tutte le tabelle di anagrafica da Firestore a Dexie.
 * Pulisce le tabelle locali e le ripopola con i dati freschi da Firestore.
 * @param db - L'istanza del database Dexie.
 */
export const syncAnagrafiche = async (db: Dexie) => {
  const firestore = getFirestore();
  console.log('Inizio sincronizzazione anagrafiche...');

  for (const config of ANAGRAFICHE_CONFIG) {
    try {
      const { anagraficaId, firestoreCollection, dexieTable } = config;
      const table = db.table(dexieTable);

      // 1. Scarica tutti i dati da Firestore
      const snapshot = await getDocs(collection(firestore, firestoreCollection));
      const dataFromFirestore = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Scaricati ${dataFromFirestore.length} record per ${anagraficaId}`);

      // 2. Svuota la tabella locale
      await table.clear();
      console.log(`Tabella locale ${dexieTable} svuotata.`);

      // 3. Inserisce i nuovi dati in blocco
      if (dataFromFirestore.length > 0) {
        await table.bulkPut(dataFromFirestore);
        console.log(`Inseriti ${dataFromFirestore.length} record in ${dexieTable}.`);
      }

    } catch (error) {
      console.error(`Errore durante la sincronizzazione della tabella ${config.firestoreCollection}:`, error);
      // Lancia l'errore per bloccare il processo se una tabella fondamentale non si sincronizza
      throw new Error(`Sincronizzazione fallita per ${config.firestoreCollection}`);
    }
  }
  console.log('Sincronizzazione anagrafiche completata.');
};

/**
 * Sincronizza i rapportini da Firestore a Dexie.
 * Per ora, scarica tutti i rapportini. In futuro, si potrà ottimizzare per scaricare solo i più recenti.
 * @param db - L'istanza del database Dexie.
 */
export const syncRapportini = async (db: Dexie) => {
  const firestore = getFirestore();
  const rapportiniCollection = 'rapportini';
  console.log('Inizio sincronizzazione rapportini...');

  try {
    const table = db.table('rapportini');

    // 1. Scarica i dati da Firestore
    const snapshot = await getDocs(collection(firestore, rapportiniCollection));
    const dataFromFirestore = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Scaricati ${dataFromFirestore.length} rapportini.`);

    // 2. Svuota la tabella locale
    await table.clear();
    console.log(`Tabella locale rapportini svuotata.`);

    // 3. Inserisce i nuovi dati
    if (dataFromFirestore.length > 0) {
      await table.bulkPut(dataFromFirestore);
      console.log(`Inseriti ${dataFromFirestore.length} rapportini in locale.`);
    }

  } catch (error) {
    console.error(`Errore durante la sincronizzazione dei rapportini:`, error);
    throw new Error('Sincronizzazione rapportini fallita');
  }
  console.log('Sincronizzazione rapportini completata.');
};
