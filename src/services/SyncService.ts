import { useGlobalStore } from '@/stores/globalStore';
import { logger } from '@/utils/logger';

/**
 * Avvia il processo di sincronizzazione iniziale.
 * Questa funzione è ora un semplice wrapper attorno alla logica centralizzata in `useGlobalStore`.
 */
export const avviaSincronizzazioneCompleta = async () => {
  logger.log("SyncService: Avvio della sincronizzazione completa richiesto...");

  // CORREZIONE:
  // Tutta la logica di sincronizzazione, inclusa la gestione dello stato isSyncing,
  // è ora gestita centralmente all'interno di `runInitialSync` nello store.
  // Non è più necessario gestire lo stato di `isSyncing` o `lastSync` da qui.
  await useGlobalStore.getState().runInitialSync();
  
  logger.log("SyncService: Processo di sincronizzazione completato.");
};
