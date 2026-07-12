
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { EnrichedRapportino, Rapportino } from '@/models/definitions';
import { useMemo } from 'react';

export interface RapportiniFilters {
    dataDa?: string | null;
    dataA?: string | null;
    tecnicoId?: string | null;
    naveId?: string | null;
    luogoId?: string | null;
    tipoGiornataId?: string | null;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    enabled?: boolean;
}

/**
 * Hook completamente refattorizzato per funzionare con Dexie e useLiveQuery.
 * Legge i rapportini e le anagrafiche correlate dal database locale,
 * arricchisce i dati e applica filtri e paginazione lato client.
 */
const useRapportini = (filters: RapportiniFilters, page: number = 1, pageSize: number = 15) => {
    const { 
        enabled = true, 
        dataDa, 
        dataA, 
        tecnicoId, 
        naveId, 
        luogoId, 
        tipoGiornataId, 
        sortBy = 'data', 
        sortOrder = 'desc' 
    } = filters;

    // 1. Carica tutte le anagrafiche necessarie da Dexie in modo reattivo
    const anagrafiche = useLiveQuery(() => {
        if (!enabled) return undefined;
        return Promise.all([
            db.navi.toArray(),
            db.luoghi.toArray(),
            db.tipiGiornata.toArray(),
            db.tecnici.toArray(),
        ]).then(([navi, luoghi, tipiGiornata, tecnici]) => ({
            navi, luoghi, tipiGiornata, tecnici
        }));
    }, [enabled]);

    // 2. Trasforma le anagrafiche in mappe per un accesso efficiente (memoizzato)
    const anagraficheMaps = useMemo(() => {
        if (!anagrafiche) return null;
        return {
            navi: new Map(anagrafiche.navi.map(item => [item.id, item])),
            luoghi: new Map(anagrafiche.luoghi.map(item => [item.id, item])),
            tipiGiornata: new Map(anagrafiche.tipiGiornata.map(item => [item.id, item])),
            tecnici: new Map(anagrafiche.tecnici.map(item => [item.id, item])),
        };
    }, [anagrafiche]);

    // 3. Carica, filtra e ordina i rapportini usando useLiveQuery
    const rapportini = useLiveQuery(async () => {
        if (!enabled) return [];

        let query = db.rapportini.orderBy(sortBy);
        if (sortOrder === 'desc') {
            query = query.reverse();
        }

        return query.toArray();

    }, [enabled, sortBy, sortOrder]);

    // 4. Arricchisci e filtra i rapportini solo quando i dati o i filtri cambiano (memoizzato)
    const processedData = useMemo(() => {
        if (!rapportini || !anagraficheMaps) return null;

        const filtered = rapportini.filter(r => {
            const dataRapportino = new Date(r.data);
            if (dataDa && dataRapportino < new Date(dataDa)) return false;
            if (dataA && dataRapportino > new Date(dataA)) return false;
            if (tecnicoId && !(r.presenze || []).includes(tecnicoId)) return false;
            if (naveId && r.naveId !== naveId) return false;
            if (luogoId && r.luogoId !== luogoId) return false;
            if (tipoGiornataId && r.tipoGiornataId !== tipoGiornataId) return false;
            return true;
        });

        const enriched = filtered.map((r: Rapportino): EnrichedRapportino => {
            const tipoGiornata = anagraficheMaps.tipiGiornata.get(r.tipoGiornataId);
            return {
                ...r,
                dataFormatted: new Date(r.data).toLocaleDateString(),
                tipoGiornata: tipoGiornata,
                tipoGiornataNome: tipoGiornata?.nome || 'N/D',
                naveNome: anagraficheMaps.navi.get(r.naveId)?.nome || 'N/D',
                luogoNome: anagraficheMaps.luoghi.get(r.luogoId)?.nome || 'N/D',
                oreGiorno: r.oreLavoro || 0, // Semplificazione, la logica complessa andrebbe qui
                oreOrdinarie: 0, // Placeholder
                oreStraordinarie: 0, // Placeholder
                isEditable: true, // Placeholder
                isDirty: (r as any).isDirty || 0, // Includi lo stato 'dirty'
            };
        });

        return enriched;

    }, [rapportini, anagraficheMaps, dataDa, dataA, tecnicoId, naveId, luogoId, tipoGiornataId]);

    // 5. Applica la paginazione all'array processato
    const paginatedData = useMemo(() => {
        if (!processedData) return [];
        return processedData.slice((page - 1) * pageSize, page * pageSize);
    }, [processedData, page, pageSize]);

    const loading = rapportini === undefined || anagrafiche === undefined;
    const hasMore = processedData ? processedData.length > page * pageSize : false;

    return { rapportini: paginatedData, loading, hasMore };
};

export default useRapportini;
