import { getFunctions, httpsCallable } from 'firebase/functions';
import { anagraficheConfig, AnagraficaKey } from '../config/anagrafiche.config';
import { useGlobalStore } from '@/stores/globalStore';
import { logger } from '@/utils/logger';

interface GestisciAnagraficaPayload {
  collectionName: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
}

const functions = getFunctions();
const gestisciAnagrafica = httpsCallable<GestisciAnagraficaPayload, { success: boolean; id: string }>(functions, 'master_gestisciAnagrafica');

/**
 * Servizio unificato per la gestione delle anagrafiche, ora allineato con il Modello Ibrido.
 * Esegue l'operazione di scrittura tramite Cloud Function e, in caso di successo,
 * avvia una sincronizzazione mirata per aggiornare la cache locale (Dexie).
 *
 * @param collectionName - Il nome della collezione Firestore (es. 'clienti', 'navi').
 * @param operation - L'operazione da eseguire: 'create', 'update', o 'delete'.
 * @param data - L'oggetto dati per l'operazione. Deve contenere un 'id' per update e delete.
 * @returns L'esito dell'operazione dalla Cloud Function.
 */
export const anagraficheService = async (
  collectionName: AnagraficaKey,
  operation: 'create' | 'update' | 'delete',
  data: any
) => {
  try {
    if (!anagraficheConfig[collectionName]) {
      throw new Error(`La collezione '${collectionName}' non è configurata.`);
    }
    if ((operation === 'update' || operation === 'delete') && !data.id) {
      throw new Error(`L'operazione di '${operation}' richiede un ID.`);
    }

    const payload: GestisciAnagraficaPayload = {
      collectionName,
      operation,
      data,
    };

    logger.log(`[AnagraficheService] Invio payload alla CF:`, payload);
    const result = await gestisciAnagrafica(payload);
    logger.log(`[AnagraficheService] Risultato dalla CF:`, result.data);

    if (result.data.success) {
      logger.log(`[AnagraficheService] Operazione ${operation} su ${collectionName} riuscita. Avvio sync mirato.`);
      await useGlobalStore.getState().syncCollectionByName(collectionName as any);
    } else {
        throw new Error(`Operazione ${operation} su ${collectionName} fallita sul server.`);
    }

    return result.data;

  } catch (error) {
    const typedError = error as Error;
    logger.error(`[AnagraficheService] Errore durante l'operazione '${operation}' su '${collectionName}':`, typedError.message);
    useGlobalStore.getState().showNotification(`Errore in ${operation} ${collectionName}: ${typedError.message}`, 'error');
    throw error;
  }
};
