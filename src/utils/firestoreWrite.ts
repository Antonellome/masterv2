import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Aggiorna un documento in una collezione di anagrafiche e contemporaneamente
 * aggiorna il timestamp di versione nel documento `system/anagrafiche`.
 * Utilizza un batch per garantire che entrambe le operazioni avvengano atomicamente.
 *
 * @param collectionName Il nome della collezione (es. 'tecnici').
 * @param docId L'ID del documento da aggiornare.
 * @param data I dati da aggiornare nel documento.
 */
export const updateAnagraficaWithVersion = async (collectionName: string, docId: string, data: object) => {
  const batch = writeBatch(db);

  // 1. Imposta l'operazione di aggiornamento per il documento specifico
  const docRef = doc(db, collectionName, docId);
  batch.update(docRef, data);

  // 2. Imposta l'operazione di aggiornamento per il documento di versione
  const versionDocRef = doc(db, 'system', 'anagrafiche');
  batch.update(versionDocRef, { version: serverTimestamp() });

  // 3. Esegue il batch
  await batch.commit();
};

/**
 * Aggiunge un nuovo documento a una collezione di anagrafiche e contemporaneamente
 * aggiorna il timestamp di versione.
 *
 * @param collectionName Il nome della collezione (es. 'tecnici').
 * @param data I dati del nuovo documento.
 */
export const addAnagraficaWithVersion = async (collectionName: string, data: object) => {
    const batch = writeBatch(db);

    // 1. Crea un riferimento per un nuovo documento con un ID generato automaticamente
    const newDocRef = doc(collection(db, collectionName));
    batch.set(newDocRef, data);

    // 2. Imposta l'operazione di aggiornamento per il documento di versione
    const versionDocRef = doc(db, 'system', 'anagrafiche');
    batch.update(versionDocRef, { version: serverTimestamp() });

    // 3. Esegue il batch
    await batch.commit();
};

/**
 * Cancella un documento da una collezione di anagrafiche e contemporaneamente
 * aggiorna il timestamp di versione.
 *
 * @param collectionName Il nome della collezione.
 * @param docId L'ID del documento da cancellare.
 */
export const deleteAnagraficaWithVersion = async (collectionName: string, docId: string) => {
    const batch = writeBatch(db);

    // 1. Imposta l'operazione di cancellazione per il documento specifico
    const docRef = doc(db, collectionName, docId);
    batch.delete(docRef);

    // 2. Imposta l'operazione di aggiornamento per il documento di versione
    const versionDocRef = doc(db, 'system', 'anagrafiche');
    batch.update(versionDocRef, { version: serverTimestamp() });

    // 3. Esegue il batch
    await batch.commit();
};

