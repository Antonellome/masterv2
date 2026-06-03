
// src/hooks/useRapportinoSingolo.ts
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAnagraficaData } from './useAnagraficaData';
import type { Rapportino, Tecnico, Cliente, Nave, Luogo, Veicolo, TipoGiornata } from '@/models/definitions';

interface PopulatedRapportino extends Omit<Rapportino, 'tecnicoId' | 'clienteId' | 'naveId' | 'luogoId' | 'veicoloId' | 'tipoGiornataId' | 'presenze'> {
    tecnico?: Tecnico;
    cliente?: Cliente;
    nave?: Nave;
    luogo?: Luogo;
    veicolo?: Veicolo;
    tipoGiornata?: TipoGiornata;
    presenze: (Tecnico | undefined)[];
}

interface UseRapportinoSingoloReturn {
    rapportino: PopulatedRapportino | null;
    loading: boolean;
    error: Error | null;
}

export const useRapportinoSingolo = (rapportinoId: string | undefined): UseRapportinoSingoloReturn => {
    const [rapportino, setRapportino] = useState<PopulatedRapportino | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const { data: tecnici = [], loading: lTecn } = useAnagraficaData<Tecnico>('tecnici');
    const { data: clienti = [], loading: lCli } = useAnagraficaData<Cliente>('clienti');
    const { data: navi = [], loading: lNav } = useAnagraficaData<Nave>('navi');
    const { data: luoghi = [], loading: lLuo } = useAnagraficaData<Luogo>('luoghi');
    const { data: veicoli = [], loading: lVei } = useAnagraficaData<Veicolo>('veicoli');
    const { data: tipiGiornata = [], loading: lTip } = useAnagraficaData<TipoGiornata>('tipiGiornata');

    const anagraficheLoading = lTecn || lCli || lNav || lLuo || lVei || lTip;

    useEffect(() => {
        if (!rapportinoId) {
            setLoading(false);
            return;
        }
        if (anagraficheLoading) return;

        const fetchRapportino = async () => {
            setLoading(true);
            try {
                const rapportinoRef = doc(db, 'rapportini', rapportinoId);
                const rapportinoSnap = await getDoc(rapportinoRef);

                if (!rapportinoSnap.exists()) {
                    throw new Error('Rapportino non trovato');
                }

                const data = rapportinoSnap.data() as Rapportino;

                const tecniciMap = new Map(tecnici.map(t => [t.id, t]));

                const populated: PopulatedRapportino = {
                    ...data,
                    tecnico: tecnici.find(t => t.id === data.tecnicoId),
                    cliente: clienti.find(c => c.id === data.clienteId),
                    nave: navi.find(n => n.id === data.naveId),
                    luogo: luoghi.find(l => l.id === data.luogoId),
                    veicolo: veicoli.find(v => v.id === data.veicoloId),
                    tipoGiornata: tipiGiornata.find(tg => tg.id === data.tipoGiornataId),
                    presenze: (data.presenze || []).map(pId => tecniciMap.get(pId))
                };

                setRapportino(populated);
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setLoading(false);
            }
        };

        fetchRapportino();

    }, [rapportinoId, anagraficheLoading, tecnici, clienti, navi, luoghi, veicoli, tipiGiornata]);

    return { rapportino, loading, error };
};
