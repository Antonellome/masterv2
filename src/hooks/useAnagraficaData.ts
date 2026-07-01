import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import type { AnagraficaBase } from '@/models/definitions';
import { useCollectionData } from './useCollectionData'; // Importa il nuovo hook

/**
 * Hook per caricare i dati di una specifica anagrafica (collezione) da Firestore.
 * Utilizza un fetch una-tantum per efficienza e fornisce una funzione di refresh.
 * 
 * @param collectionName Il nome della collezione Firestore da cui caricare i dati.
 * @returns Un oggetto con `data`, `loading`, `error`, e `refresh`.
 */
export const useAnagraficaData = <T extends AnagraficaBase>(collectionName: string) => {
    const q = useMemo(() => query(collection(db, collectionName), orderBy('nome', 'asc')), [collectionName]);

    // Usa il nuovo hook con l'opzione per non ascoltare in tempo reale
    const { data, loading, error, refresh } = useCollectionData<T>(q, { listen: false });

    return { data, loading, error, refresh };
};
