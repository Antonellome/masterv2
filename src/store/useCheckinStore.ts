
import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/config/firebase';
import type { Checkin } from '@/models/definitions';

// Lo stato non conterrà più la funzione unsubscribe, per evitare loop di re-render.
interface CheckinState {
  checkins: Checkin[];
  loading: boolean;
  error: string | null;
  // La funzione di sottoscrizione ora restituirà direttamente la funzione di pulizia (unsubscribe).
  subscribeToCheckins: () => () => void;
}

/**
 * Store Zustand per la gestione dei check-in giornalieri in tempo reale da Firestore.
 */
export const useCheckinStore = create<CheckinState>((set) => ({
  checkins: [],
  loading: true,
  error: null,

  /**
   * Avvia l'ascolto in tempo reale della collezione 'checkin_giornalieri' su Firestore.
   * Questa funzione restituisce la funzione `unsubscribe` che verrà usata per la pulizia nell'useEffect.
   */
  subscribeToCheckins: () => {
    set({ loading: true, error: null });

    const q = query(collection(firestoreDb, 'checkin_giornalieri'), orderBy('timestampReale', 'desc'));

    // onSnapshot restituisce di per sé la funzione per smettere di ascoltare.
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const checkinsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestampImpostato: data.timestampImpostato instanceof Timestamp ? data.timestampImpostato.toDate() : data.timestampImpostato,
            timestampReale: data.timestampReale instanceof Timestamp ? data.timestampReale.toDate() : data.timestampReale,
          } as Checkin;
        });
        
        set({ checkins: checkinsData, loading: false });
      },
      (err) => {
        console.error("Errore durante l'ascolto dei check-in:", err);
        set({ error: "Si è verificato un errore nel caricamento delle presenze.", loading: false });
      }
    );

    // Restituisco la funzione di pulizia.
    return unsubscribe;
  },
}));
