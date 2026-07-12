
import { useMemo } from 'react';
import { db } from '../db/db'; // Importiamo il nostro database Dexie
import { useCollectionData } from './useCollectionData';
import type { Tecnico, Nave, Luogo } from '../models/definitions';

/**
 * Hook per recuperare le anagrafiche di base dal database locale (Dexie).
 * I dati vengono popolati nel database locale dal SyncService.
 */
export const useAnagrafiche = () => {
  // Ora usiamo le tabelle Dexie direttamente con il nostro hook refattorizzato.
  const { data: tecnici, loading: lTecnici, error: eTecnici } = useCollectionData<Tecnico>(db.tecnici);
  const { data: navi, loading: lNavi, error: eNavi } = useCollectionData<Nave>(db.navi);
  const { data: luoghi, loading: lLuoghi, error: eLuoghi } = useCollectionData<Luogo>(db.luoghi);

  const loading = lTecnici || lNavi || lLuoghi;
  const error = eTecnici || eNavi || eLuoghi;

  // La logica di memoizzazione rimane identica, ma ora i dati sottostanti 
  // provengono da Dexie e sono aggiornati reattivamente da useLiveQuery.
  const anagrafiche = useMemo(() => ({
    tecnici,
    navi,
    luoghi
  }), [tecnici, navi, luoghi]);

  return { ...anagrafiche, loading, error };
};
