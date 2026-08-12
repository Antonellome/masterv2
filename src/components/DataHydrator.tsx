
import { useEffect } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import { syncAnagrafiche, syncRapportini } from '@/services/SyncService';
import { loadAllData } from '@/db/db';

export const DataHydrator = () => {
  const { isAuthenticated, setAnagrafiche, setRapportini, setLastUpdated, setConflicts } = useGlobalStore(state => ({
    isAuthenticated: state.isAuthenticated,
    setAnagrafiche: state.setAnagrafiche,
    setRapportini: state.setRapportini,
    setLastUpdated: state.setLastUpdated,
    setConflicts: state.setConflicts,
  }));

  useEffect(() => {
    const performSync = async () => {
      console.log('[DataHydrator] Avvio sincronizzazione...');
      try {
        const [anagraficheConflicts, rapportiniConflicts] = await Promise.all([
          syncAnagrafiche(),
          syncRapportini(),
        ]);

        const allConflicts = [...anagraficheConflicts, ...rapportiniConflicts];
        if (allConflicts.length > 0) {
          console.warn('[DataHydrator] Conflitti rilevati durante la sincronizzazione:', allConflicts);
          setConflicts(allConflicts);
        }

        console.log('[DataHydrator] Sincronizzazione completata, ricaricamento dati da IndexedDB...');
        const { anagrafiche, rapportini, lastUpdated } = await loadAllData();

        setAnagrafiche(anagrafiche);
        setRapportini(rapportini);
        setLastUpdated(lastUpdated);

        console.log('[DataHydrator] Dati ricaricati nello store.');

      } catch (error) {
        console.error('[DataHydrator] Errore critico durante la sincronizzazione:', error);
      }
    };

    if (isAuthenticated) {
      performSync();
      
      const intervalId = setInterval(performSync, 5 * 60 * 1000);

      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, setAnagrafiche, setRapportini, setLastUpdated, setConflicts]);

  return null;
};
