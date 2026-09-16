import { getFunctions, httpsCallable } from 'firebase/functions';
import { anagraficheConfig } from '../config/anagrafiche.config';

// Definiamo i tipi per l'input della funzione
interface GestisciAnagraficaPayload {
  collectionName: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
}

// Otteniamo un'istanza di Firebase Functions
const functions = getFunctions();

// Creiamo un riferimento alla nostra Cloud Function 'master_gestisciAnagrafica'
const gestisciAnagrafica = httpsCallable<GestisciAnagraficaPayload, { success: boolean; id: string }>(functions, 'master_gestisciAnagrafica');

/**
 * Servizio unificato per la gestione delle anagrafiche tramite Cloud Function.
 * Centralizza le operazioni di creazione, modifica ed eliminazione.
 *
 * @param collectionName - Il nome della collezione (es. 'clienti', 'navi').
 * @param operation - L'operazione da eseguire: 'create', 'update', o 'delete'.
 * @param data - L'oggetto dati per l'operazione. Per 'update' e 'delete', deve contenere un 'id'.
 * @returns L'esito dell'operazione dalla Cloud Function.
 */
export const anagraficheService = async (
  collectionName: string,
  operation: 'create' | 'update' | 'delete',
  data: any
) => {
  try {
    // Validazione preliminare dei dati
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

    console.log('Invio payload alla Cloud Function:', payload);
    const result = await gestisciAnagrafica(payload);
    console.log('Risultato dalla Cloud Function:', result.data);

    return result.data;
  } catch (error) {
    console.error(`Errore durante l'operazione '${operation}' su '${collectionName}':`, error);
    // Rilanciamo l'errore per permettere al chiamante di gestirlo (es. mostrare una notifica all'utente)
    throw error;
  }
};
