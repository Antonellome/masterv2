import { useMemo } from 'react';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { Scadenza } from '@/models/definitions';

/**
 * Custom hook to process and categorize deadlines from the store.
 * It provides memoized lists of deadlines that are expired, expiring soon,
 * or upcoming.
 *
 * @returns An object containing categorized deadlines and a silence toggle.
 */
export const useScadenze = () => {
    // Correctly select states from the store
    const { scadenze, isScadenzaSilenced, toggleScadenzaSilence } = useRapportiniStore(state => ({
        scadenze: state.scadenze || [], // <--- FIX: Default to an empty array to prevent crash on initial render
        isScadenzaSilenced: state.isScadenzaSilenced,
        toggleScadenzaSilence: state.toggleScadenzaSilence
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processedScadenze = useMemo(() => {
        const result: {
            scadute: Scadenza[];
            inScadenza: Scadenza[];
            prossime: Scadenza[];
        } = {
            scadute: [],
            inScadenza: [],
            prossime: [],
        };

        // The scadenze array is now guaranteed to exist.
        scadenze.forEach(s => {
            if (!s.data) return; // Skip if data is invalid

            const scadenzaDate = s.data.toDate();
            scadenzaDate.setHours(0, 0, 0, 0);

            const diffTime = scadenzaDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                result.scadute.push(s);
            } else if (diffDays <= (s.giorniPreavviso || 30)) {
                result.inScadenza.push(s);
            } else {
                result.prossime.push(s);
            }
        });

        // Sort each category
        const sortByDate = (a: Scadenza, b: Scadenza) => (a.data?.toDate().getTime() || 0) - (b.data?.toDate().getTime() || 0);
        result.scadute.sort(sortByDate);
        result.inScadenza.sort(sortByDate);
        result.prossime.sort(sortByDate);

        return result;
    }, [scadenze, today]);

    return {
        ...processedScadenze,
        isSilenced: isScadenzaSilenced,
        toggleSilence: toggleScadenzaSilence,
    };
};