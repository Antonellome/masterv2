
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useState, useCallback } from 'react';

/**
 * Hook reattivo e ultra-robusto per recuperare dati da una tabella di Dexie.
 * Accetta il NOME della tabella e logga errori specifici se l'input non è valido.
 *
 * @param tableName Il nome della tabella da cui recuperare i dati (es. 'clienti').
 * @returns Un oggetto con `data`, `loading`, `error`, e una funzione `forceRefresh`.
 */
export function useCollectionData<T>(tableName: any) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Cattura lo stack di chiamata per il debugging.
  // Questo ci dirà QUALE componente sta chiamando l'hook in modo errato.
  const callStack = new Error().stack;

  const result = useLiveQuery(async () => {
    // --- CONTROLLO DI ROBUSTEZZA DEFINITIVO ---

    // 1. L'input è una stringa valida e non vuota? Se no, logga l'errore e fermati.
    if (typeof tableName !== 'string' || !tableName.trim()) {
      console.error(
        'ERRORE CRITICO in useCollectionData: `tableName` non è una stringa valida.',
        {
          receivedValue: tableName,
          type: typeof tableName,
          callStack: callStack?.split('\n')[2]?.trim() || 'Stack non disponibile'
        }
      );
      // Restituisce un errore chiaro per segnalare il problema a monte.
      return { data: [], error: new Error(`Input non valido per useCollectionData: ricevuto ${typeof tableName}`) };
    }

    // 2. La tabella con questo nome esiste nello schema del DB? Se no, fermati.
    const tableExists = db.tables.some(t => t.name === tableName);
    if (!tableExists) {
        const err = new Error(`La tabella "${tableName}" non esiste nel database locale.`);
        console.warn(err.message); 
        return { data: [], error: err };
    }

    // 3. Se tutti i controlli sono superati, procedi con la query in sicurezza.
    try {
      const table = db.table(tableName);
      const items = await table.toArray();
      return { data: items as T[], error: null };
    } catch (e: any) {
      console.error(`Errore imprevisto durante la lettura dalla tabella Dexie "${tableName}":`, e);
      return { data: [], error: e };
    }
    
  }, [tableName, refreshKey]);

  const loading = result === undefined;

  const forceRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    data: result?.data,
    loading,
    error: result?.error,
    forceRefresh
  };
}
