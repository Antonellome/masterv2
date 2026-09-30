
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Anagrafica } from '@/models/definitions';
import { useState, useEffect } from 'react';

export const useAnagrafica = () => {

    // Rimuoviamo ogni riferimento alla tabella 'qualifiche' che causava il crash.
    const { data: tecnici, isLoading: isLoadingTecnici, error: errorTecnici } = useLiveQueryExtended(
        () => db.tecnici.toArray(), 
        [], 
        'tecnici'
    );

    const getTecnicoById = (id: string) => {
        return tecnici?.find(t => t.id === id);
    };

    return {
        tecnici,
        isLoading: isLoadingTecnici,
        error: errorTecnici,
        getTecnicoById,
    };
};

// Hook custom per estendere useLiveQuery con gestione errori e caricamento
const useLiveQueryExtended = (query: () => Promise<any[]>, deps: any[], tableName: string) => {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const executeQuery = async () => {
            setIsLoading(true);
            try {
                const result = await query();
                setData(result);
                setError(null);
            } catch (err: any) {
                console.error(`Errore durante la lettura dalla collezione ${tableName} in Dexie:`, err);
                setError(err);
                setData([]);
            } finally {
                setIsLoading(false);
            }
        };

        executeQuery();

        // Dexie-react-hooks si occupa di aggiornare, ma qui replichiamo il fetch iniziale 
        // per avere un controllo più fine su caricamento ed errori.

    }, deps);

    // usiamo useLiveQuery per la reattività
    const liveData = useLiveQuery(query, deps, []);

    useEffect(() => {
        if (liveData) {
            setData(liveData);
        }
    }, [liveData]);

    return { data, isLoading, error };
};