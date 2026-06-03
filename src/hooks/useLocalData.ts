import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { MasterData } from '@/models/definitions';

// NOTA PER L'APP MASTER: Questa è un'implementazione "bridge" dell'hook useLocalData.
// A differenza dell'App Tecnici che privilegia la cache locale (IndexedDB) per l'offline,
// questa versione per l'App Master carica i dati direttamente da Firestore.
// Questo garantisce che l'ufficio lavori sempre con le anagrafiche più aggiornate.

export const useLocalData = () => {
    const [data, setData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [tecniciSnap, tipiGiornataSnap, veicoliSnap, naviSnap, luoghiSnap] = await Promise.all([
                    getDocs(collection(firestoreDb, 'tecnici')),
                    getDocs(collection(firestoreDb, 'tipiGiornata')),
                    getDocs(collection(firestoreDb, 'veicoli')),
                    getDocs(collection(firestoreDb, 'navi')),
                    getDocs(collection(firestoreDb, 'luoghi'))
                ]);

                const masterData: MasterData = {
                    tecnici: tecniciSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                    tipiGiornata: tipiGiornataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                    veicoli: veicoliSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                    navi: naviSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                    luoghi: luoghiSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                };

                setData(masterData);
            } catch (e) {
                setError(e as Error);
                console.error("Errore durante il caricamento dei master data da Firestore: ", e);
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    return { data, loading, error };
};
