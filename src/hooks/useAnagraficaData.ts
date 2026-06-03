
// src/hooks/useAnagraficaData.ts
import { useFirestoreData } from './useFirestoreData';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import type { AnagraficaBase } from '@/models/definitions';

/**
 * Hook per caricare i dati di una specifica anagrafica (collezione) da Firestore.
 * Utilizza un fetch una-tantum per efficienza e fornisce una funzione di refresh.
 * 
 * @param collectionName Il nome della collezione Firestore da cui caricare i dati.
 * @returns Un oggetto con `data`, `loading`, `error`, e `refresh`.
 */
export const useAnagraficaData = <T extends AnagraficaBase>(collectionName: string) => {
    const q = query(collection(db, collectionName), orderBy('nome', 'asc'));

    // Ora `useFirestoreData` restituisce anche la funzione `refresh`.
    const { data, loading, error, refresh } = useFirestoreData<T>(q, { listen: false });

    // Restituiamo `refresh` in modo che i componenti possano usarlo.
    return { data, loading, error, refresh };
};
