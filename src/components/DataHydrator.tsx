
import { useEffect, useRef } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
// Importa l'unica funzione di sincronizzazione corretta
import { avviaSincronizzazioneCompleta } from '@/services/SyncService';

export const DataHydrator = () => {
  const isAuthenticated = useGlobalStore(state => state.isAuthenticated);

  // Ref per l'intervallo, per evitare riesecuzioni dell'effetto
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const performSync = async () => {
      // La guardia principale: non fare nulla se la sincronizzazione è già in corso.
      if (useGlobalStore.getState().isSyncing) {
        console.log('[DataHydrator] Sincronizzazione già in corso. Salto.');
        return;
      }
      console.log('[DataHydrator] Avvio Sincronizzazione Completa...');
      await avviaSincronizzazioneCompleta();
      console.log('[DataHydrator] Sincronizzazione Completa terminata.');
    };

    if (isAuthenticated) {
      // Esegui la prima sincronizzazione all'avvio
      performSync();

      // Pulisci intervalli precedenti
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Imposta la sincronizzazione periodica ogni 5 minuti
      intervalRef.current = setInterval(performSync, 5 * 60 * 1000);

    } else {
      // Se l'utente fa logout, pulisci l'intervallo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Funzione di pulizia per smontaggio del componente
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

  // L'effetto dipende solo dallo stato di autenticazione.
  }, [isAuthenticated]);

  // Questo componente non renderizza nulla.
  return null;
};
