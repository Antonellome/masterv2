
import { useLiveQuery } from 'dexie-react-hooks';
import { db, AnagraficaTable } from '@/db/db';

/**
 * Hook reattivo e robusto per recuperare dati da una tabella anagrafica di Dexie.
 * Accetta il NOME della tabella come stringa per evitare errori di tipo.
 *
 * @param tableName Il nome della tabella da cui recuperare i dati (es. 'clienti').
 * @returns Un oggetto con `data`, `loading`, `error`.
 */
export function useCollectionData<T>(tableName: AnagraficaTable) {
  
  const data = useLiveQuery(() => {
    // Seleziona la tabella dinamicamente dal nome
    const table = db[tableName];
    if (table) {
      return table.toArray();
    }
    return []; // Ritorna un array vuoto se il nome tabella non è valido
  }, [tableName]); // La query si riesegue se il nome della tabella cambia

  const loading = data === undefined;
  
  // Semplifichiamo la gestione dell'errore. useLiveQuery è già robusto.
  const error = data === undefined && !loading ? new Error(`Tabella non trovata: ${tableName}`) : null;

  return { data: data || [], loading, error };
}
