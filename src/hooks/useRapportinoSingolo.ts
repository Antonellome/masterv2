
import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useCollectionData } from './useCollectionData'; // Uso l'hook robusto!
import type { Rapportino, Tecnico, Cliente, Nave, Luogo, Veicolo, TipoGiornata, EnrichedRapportino } from '@/models/definitions';

interface UseRapportinoSingoloReturn {
    rapportino: EnrichedRapportino | null;
    loading: boolean;
    error: Error | null;
}

export const useRapportinoSingolo = (rapportinoId: string | undefined): UseRapportinoSingoloReturn => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // 1. CARICO IL SINGOLO RAPPORTINO DA DEXIE
    const rapportino = useLiveQuery(() => {
        if (!rapportinoId) return undefined;
        return db.rapportini.get(rapportinoId);
    }, [rapportinoId]);

    // 2. CARICO TUTTE LE ANAGRAFICHE USANDO IL NUOVO HOOK ROBUSTO
    const { data: tecnici, loading: lTecn } = useCollectionData<Tecnico>('tecnici');
    const { data: clienti, loading: lCli } = useCollectionData<Cliente>('clienti');
    const { data: navi, loading: lNav } = useCollectionData<Nave>('navi');
    const { data: luoghi, loading: lLuo } = useCollectionData<Luogo>('luoghi');
    const { data: veicoli, loading: lVei } = useCollectionData<Veicolo>('veicoli');
    const { data: tipiGiornata, loading: lTip } = useCollectionData<TipoGiornata>('tipiGiornata');

    const anagraficheLoading = lTecn || lCli || lNav || lLuo || lVei || lTip;

    // 3. ESEGUO L'"ARRICCHIMENTO" DEI DATI
    const enrichedRapportino = useMemo((): EnrichedRapportino | null => {
        if (!rapportino || anagraficheLoading) return null;

        const tecniciMap = new Map(tecnici.map(t => [t.id, t]));
        const tipoGiornata = tipiGiornata.find(tg => tg.id === rapportino.tipoGiornataId);

        return {
            ...rapportino,
            dataFormatted: new Date(rapportino.data).toLocaleDateString(),
            tecnico: tecnici.find(t => t.id === rapportino.tecnicoId),
            cliente: clienti.find(c => c.id === rapportino.clienteId),
            nave: navi.find(n => n.id === rapportino.naveId),
            luogo: luoghi.find(l => l.id === rapportino.luogoId),
            veicolo: veicoli.find(v => v.id === rapportino.veicoloId),
            tipoGiornata: tipoGiornata,
            tipoGiornataNome: tipoGiornata?.nome || 'N/D',
            presenze: (rapportino.presenze || []).map(pId => tecniciMap.get(pId)),
            // Aggiungo i campi mancanti per l'interfaccia EnrichedRapportino
            naveNome: navi.find(n => n.id === rapportino.naveId)?.nome || 'N/D',
            luogoNome: luoghi.find(l => l.id === rapportino.luogoId)?.nome || 'N/D',
            oreGiorno: rapportino.oreLavoro || 0,
            oreOrdinarie: 0, // Placeholder
            oreStraordinarie: 0, // Placeholder
            isEditable: true, // Placeholder
        };

    }, [rapportino, anagraficheLoading, tecnici, clienti, navi, luoghi, veicoli, tipiGiornata]);

    useEffect(() => {
        // Aggiorno lo stato di caricamento generale
        setLoading(rapportino === undefined || anagraficheLoading);
    }, [rapportino, anagraficheLoading]);

    return { rapportino: enrichedRapportino, loading, error };
};
