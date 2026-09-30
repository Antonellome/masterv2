
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

/**
 * Hook per caricare e combinare dati da diverse tabelle Dexie.
 * Gestisce lo stato di caricamento e gli errori in modo centralizzato.
 */
export const useCombinedData = () => {

    // Caricamento di tutte le anagrafiche, ora senza 'qualifiche'
    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const clienti = useLiveQuery(() => db.clienti.toArray(), []);
    const navi = useLiveQuery(() => db.navi.toArray(), []);
    const luoghi = useLiveQuery(() => db.luoghi.toArray(), []);
    const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);
    
    // Verifica dello stato di caricamento
    const isLoading = 
        tecnici === undefined ||
        clienti === undefined ||
        navi === undefined ||
        luoghi === undefined ||
        tipiGiornata === undefined;

    return {
        tecnici,
        clienti,
        navi,
        luoghi,
        tipiGiornata,
        isLoading,
    };
};