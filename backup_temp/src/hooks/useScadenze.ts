import { useEffect, useMemo } from 'react';
import { useScadenzeStore } from '../store/useScadenzeStore';
import dayjs from 'dayjs';
import type { Scadenza } from '../models/definitions';

export const useScadenze = () => {
    const {
        scadenze,
        loading,
        error,
        fetchScadenze,
        toggleSilence
    } = useScadenzeStore();

    useEffect(() => {
        if (scadenze.length === 0) { // Fetch solo se lo store è vuoto
            fetchScadenze();
        }
    }, [fetchScadenze, scadenze.length]);

    const { activeScadenze, silencedScadenze, activeScadenzeCount, overallStatus } = useMemo(() => {
        const now = dayjs();
        const active: Scadenza[] = [];
        const silenced: Scadenza[] = [];

        scadenze.forEach(s => {
            const dataScadenza = dayjs(s.data);
            if (!dataScadenza.isValid()) return;

            const giorniMancanti = dataScadenza.diff(now, 'day');

            let status: 'ok' | 'imminente' | 'scaduto' = 'ok';
            if (giorniMancanti < 0) {
                status = 'scaduto';
            } else if (giorniMancanti <= 30) {
                status = 'imminente';
            }
            
            const scadenzaConStatus = { ...s, status };

            if (s.silenced) {
                silenced.push(scadenzaConStatus);
            } else {
                // --- LA CORREZIONE È QUI ---
                // Aggiungi alla lista "Attive" solo se lo stato è critico.
                if (status === 'scaduto' || status === 'imminente') {
                    active.push(scadenzaConStatus);
                }
            }
        });

        // Il conteggio si basa sulla lunghezza della lista filtrata
        const finalActiveCount = active.length;
        const hasScaduto = active.some(s => s.status === 'scaduto');

        let overallStatus: 'ok' | 'imminente' | 'scaduto' = 'ok';
        if (hasScaduto) {
            overallStatus = 'scaduto';
        } else if (finalActiveCount > 0) {
            overallStatus = 'imminente';
        }

        const sorter = (a: Scadenza, b: Scadenza) => dayjs(a.data).diff(dayjs(b.data));

        return {
            activeScadenze: active.sort(sorter),
            silencedScadenze: silenced.sort(sorter),
            activeScadenzeCount: finalActiveCount, // Il conteggio ora corrisponde alla lista visualizzata
            overallStatus
        };
    }, [scadenze]);

    return {
        activeScadenze,
        silencedScadenze,
        activeScadenzeCount,
        overallStatus,
        loading,
        error,
        fetchScadenze,
        toggleSilence
    };
};
