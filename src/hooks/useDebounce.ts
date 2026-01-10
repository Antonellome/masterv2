import { useState, useEffect } from 'react';

/**
 * Hook personalizzato per "de-rimbalzare" un valore.
 * Attende un certo periodo di tempo prima di aggiornare il valore,
 * utile per evitare chiamate API o calcoli pesanti ad ogni singolo input dell'utente.
 * @param value Il valore da "de-rimbalzare".
 * @param delay Il ritardo in millisecondi.
 * @returns Il valore "de-rimbalzato".
 */
export function useDebounce<T>(value: T, delay: number): T {
    // Stato per memorizzare il valore "de-rimbalzato"
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Imposta un timer per aggiornare il valore dopo il ritardo specificato
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Funzione di pulizia: annulla il timer se il valore cambia prima della scadenza del ritardo
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // L'effetto si ri-esegue solo se il valore o il ritardo cambiano

    return debouncedValue;
}
