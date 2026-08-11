
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import { Anagrafica } from '@/models/definitions';

// Mappatura tra nomi delle collezioni e chiavi nello store Zustand
const anagraficheCollections: Record<string, keyof Anagrafica> = {
  ditte: 'ditte',
  clienti: 'clienti',
  veicoli: 'veicoli',
  luoghi: 'luoghi',
  navi: 'navi',
  tipiGiornata: 'tipiGiornata'
};

let unsubscribers: (() => void)[] = [];

/**
 * Sincronizza tutte le anagrafiche da Firestore allo store globale (Zustand).
 * Imposta un listener in tempo reale per ogni collezione di anagrafiche.
 */
export const syncAnagrafiche = () => {
  console.log('[SyncService] Avvio sincronizzazione anagrafiche in tempo reale.');

  // Prima di iniziare, ci assicuriamo di terminare eventuali listener precedenti
  // per evitare duplicazioni e memory leak.
  if (unsubscribers.length > 0) {
    console.warn('[SyncService] Terminazione di listener precedenti.');
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
  }

  const { setAnagrafica, setLastUpdated } = useGlobalStore.getState();

  Object.entries(anagraficheCollections).forEach(([collectionName, storeKey]) => {
    const collRef = collection(db, collectionName);
    
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[SyncService] Aggiornamento per ${collectionName}:`, items.length, 'documenti ricevuti.');
      
      // Aggiorniamo la parte specifica dello store
      setAnagrafica(storeKey, items);
      
    }, (error) => {
      console.error(`[SyncService] Errore durante la sincronizzazione di ${collectionName}:`, error);
      useGlobalStore.getState().showNotification(`Errore nel caricamento di ${collectionName}`, 'error');
    });

    // Salviamo la funzione di unsubscribe per poterla chiamare in futuro
    unsubscribers.push(unsubscribe);
  });

  // Dopo aver impostato tutti i listener, aggiorniamo il timestamp
  setLastUpdated();
};

/**
 * Funzione per interrompere tutti i listener attivi.
 * Utile al logout o quando il componente che gestisce la sincro viene smontato.
 */
export const stopSyncAnagrafiche = () => {
  console.log('[SyncService] Interruzione di tutti i listener anagrafiche.');
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];
};
