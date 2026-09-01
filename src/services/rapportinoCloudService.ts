import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import type { Rapportino } from '@/models/definitions';
import { logger } from '@/utils/logger';

// ... (altre definizioni)

// CORREZIONE: Usa la nuova funzione per admin
const getAdminRapportiniUpdatesFunction = httpsCallable<{ lastSyncTimestamp?: number }, { data: any[] }>(functions, 'adminGetAllRapportini');

export const rapportinoCloudService = {
  getUpdates: async (lastSyncTimestamp?: number) => {
    logger.log(`[RapportinoService] Chiamata a 'adminGetAllRapportini' con timestamp: ${lastSyncTimestamp || 'Nessuno'}`);
    try {
      const result = await getAdminRapportiniUpdatesFunction({ lastSyncTimestamp: lastSyncTimestamp || 0 });
      return result.data.data; 
    } catch (error: any) {
      logger.error(`[RapportinoService] Errore durante la chiamata a 'adminGetAllRapportini':`, error);
      throw new Error(`Recupero aggiornamenti fallito: ${error.message}`);
    }
  },
  // ... (create, update, delete rimangono invariate)
};