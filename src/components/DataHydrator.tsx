
import { useEffect, useRef } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import { syncAnagrafiche, syncRapportini } from '@/services/SyncService';
import { loadAllData } from '@/db/db';

export const DataHydrator = () => {
  const {
    isAuthenticated,
    isSyncInProgress,
    setIsSyncInProgress,
    setAnagrafiche,
    setRapportini,
    setLastUpdated,
    setAnagraficheLoading,
  } = useGlobalStore(state => ({
    isAuthenticated: state.isAuthenticated,
    isSyncInProgress: state.isSyncInProgress,
    setIsSyncInProgress: state.setIsSyncInProgress,
    setAnagrafiche: state.setAnagrafiche,
    setRapportini: state.setRapportini,
    setLastUpdated: state.setLastUpdated,
    setAnagraficheLoading: state.setAnagraficheLoading,
  }));

  // Usiamo un ref per gestire l'intervallo, in modo da non doverlo includere nelle dipendenze dell'effetto.
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const performSync = async () => {
      // LA VERA GUARDIA: Controlla lo stato globale. Se è true, esce subito.
      // Questo è il cuore della soluzione e previene ogni sovrapposizione.
      if (useGlobalStore.getState().isSyncInProgress) {
        console.log('[DataHydrator] Sync già in corso. Salto.');
        return;
      }

      console.log('[DataHydrator] Avvio Sincronizzazione Globale...');
      setIsSyncInProgress(true);
      setAnagraficheLoading(true);

      try {
        await Promise.all([
          syncAnagrafiche(),
          syncRapportini(),
        ]);

        console.log('[DataHydrator] Sync server OK. Ricarico dati locali...');
        const { anagrafiche, rapportini, lastUpdated } = await loadAllData();

        setAnagrafiche(anagrafiche);
        setRapportini(rapportini);
        setLastUpdated(lastUpdated);

        console.log('[DataHydrator] Store aggiornato.');

      } catch (error) {
        console.error('[DataHydrator] ERRORE SINCRONIZZAZIONE GLOBALE.', error);
      } finally {
        console.log('[DataHydrator] Fine Sincronizzazione Globale.');
        setIsSyncInProgress(false);
        setAnagraficheLoading(false);
      }
    };

    // Se l'utente è autenticato e non c'è un intervallo attivo, avvialo.
    if (isAuthenticated) {
      // Esegui subito la prima sincronizzazione
      performSync();

      // Pulisci qualsiasi intervallo precedente prima di crearne uno nuovo.
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      // Imposta l'intervallo periodico.
      intervalRef.current = setInterval(performSync, 5 * 60 * 1000);

    } else {
      // Se l'utente non è autenticato (logout), pulisci l'intervallo.
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // La funzione di pulizia viene eseguita quando il componente si smonta o prima di rieseguire l'effetto.
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

  // L'UNICA DIPENDENZA CORRETTA E NECESSARIA È LO STATO DI AUTENTICAZIONE.
  // L'effetto deve rieseguirsi solo al login/logout.
  }, [isAuthenticated, setIsSyncInProgress, setAnagraficheLoading, setAnagrafiche, setRapportini, setLastUpdated]);

  return null;
};
