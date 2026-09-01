
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { Anagrafica, Cliente, Ditta, Categoria } from '@/models/definitions';

/**
 * Definisce la struttura completa dei dati di base (anagrafiche e collezioni correlate)
 * come restituita dalla Cloud Function.
 */
export interface AllAnagraficheResponse {
  // La risposta ora è un dizionario di array, non più un oggetto complesso
  [key: string]: any[];
}

// Aggiorniamo il nome della funzione per rispecchiare il backend
const syncAllAnagraficheFunction = httpsCallable<void, AllAnagraficheResponse>(functions, 'syncAllAnagrafiche');

/**
 * Servizio per recuperare tutte le anagrafiche e le collezioni di base in un'unica chiamata.
 */
export const anagraficheService = {
  /**
   * Chiama la Cloud Function `syncAllAnagrafiche`.
   * @returns Un oggetto contenente tutte le liste di dati fondamentali.
   */
  getAll: async (): Promise<AllAnagraficheResponse> => {
    logger.log("[AnagraficheService] Chiamata a 'syncAllAnagrafiche'...");
    try {
      const result = await syncAllAnagraficheFunction();
      logger.log("[AnagraficheService] Anagrafiche ricevute con successo.");
      // La struttura dati restituita dalla funzione è già quella che ci serve
      return result.data;
    } catch (error: any) {
      logger.error("[AnagraficheService] Errore critico durante il recupero delle anagrafiche:", error);
      // In caso di errore, restituiamo un oggetto vuoto per mantenere la consistenza del tipo
      return {};
    }
  },
};
