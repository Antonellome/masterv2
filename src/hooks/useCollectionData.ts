
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { AnagraficaTable } from '@/db/database';

export function useCollectionData<T>(collectionName: AnagraficaTable) {
    const [error, setError] = useState<any>(null);

    const data = useLiveQuery(
        async () => {
            try {
                const table = db.table(collectionName);
                const items = await table.toArray();
                return items as T[];
            } catch (err) {
                console.error(`Errore durante la lettura dalla collezione ${collectionName} in Dexie:`, err);
                setError(err);
                return [];
            }
        },
        [collectionName], 
        [] 
    );

    const loading = data === undefined;

    return { data, loading, error };
}
