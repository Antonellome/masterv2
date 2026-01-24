import create from 'zustand';
import { db } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Scadenza } from '@/models/definitions';
import { scadenzeConverter } from '@/utils/converters';

interface ScadenzeState {
    scadenze: Scadenza[];
    loading: boolean;
    error: string | null;
    fetchScadenze: () => () => void; // Restituisce la funzione di unsubscribe
    toggleSilence: (id: string) => Promise<void>;
}

export const useScadenzeStore = create<ScadenzeState>((set, get) => ({
    scadenze: [],
    loading: true,
    error: null,

    fetchScadenze: () => {
        set({ loading: true, error: null });
        const scadenzeCollection = collection(db, 'scadenze').withConverter(scadenzeConverter);

        const unsubscribe = onSnapshot(scadenzeCollection, snapshot => {
            const scadenze = snapshot.docs.map(doc => doc.data());
            set({ scadenze, loading: false });
        }, error => {
            console.error("Errore nel fetch delle scadenze:", error);
            set({ error: "Impossibile caricare le scadenze.", loading: false });
        });

        return unsubscribe; // onSnapshot restituisce una funzione per annullare l'iscrizione
    },

    toggleSilence: async (id: string) => {
        const scadenze = get().scadenze;
        const scadenza = scadenze.find(s => s.id === id);

        if (scadenza) {
            const docRef = doc(db, 'scadenze', id);
            try {
                await updateDoc(docRef, { silenced: !scadenza.silenced });
                // Lo stato si aggiornerà automaticamente grazie a onSnapshot
            } catch (error) {
                console.error("Errore nell'aggiornamento della scadenza:", error);
                // Potremmo voler gestire lo stato di errore qui
            }
        }
    }
}));
