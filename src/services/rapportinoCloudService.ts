
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { logger } from '@/utils/logger';
import type { Rapportino } from '@/models/definitions';

const gestisciRapportinoFunction = httpsCallable<{
    operation: 'create' | 'update' | 'delete' | 'restore';
    data: any;
}, { success: boolean; id: string }> (functions, 'master_gestisciRapportino');

/**
 * Pulisce ricorsivamente un oggetto, convertendo i valori `undefined` in `null`.
 * Ignora gli oggetti `Date` per la successiva conversione.
 * @param obj L'oggetto da pulire.
 * @returns L'oggetto pulito.
 */
const cleanDataRecursive = (obj: any): any => {
    if (obj === undefined) {
        return null;
    }
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => cleanDataRecursive(item));
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value !== undefined) {
                newObj[key] = cleanDataRecursive(value);
            }
        }
    }
    return newObj;
};

/**
 * Prepara i dati per l'invio a Firestore, pulendo e convertendo i tipi non serializzabili.
 * @param data I dati grezzi dal form.
 * @returns I dati pronti per essere inviati.
 */
const cleanAndPrepareData = (data: Partial<Rapportino> & { id?: string }): any => {
    // 1. Rimuove ricorsivamente tutti i valori `undefined`, convertendoli in `null`.
    const cleanedData = cleanDataRecursive(data);

    // 2. Converte i campi Date in stringhe ISO 8601.
    if (cleanedData.data instanceof Date) {
        cleanedData.data = cleanedData.data.toISOString();
    }
    if (cleanedData.dataFine instanceof Date) {
        cleanedData.dataFine = cleanedData.dataFine.toISOString();
    }
    
    // 3. La firma (`firmaVettoriale`) è già una stringa e non richiede conversioni.

    return cleanedData;
};

export const rapportinoCloudService = {

    async create(rapportinoData: Partial<Rapportino>): Promise<string> {
        logger.log('[rapportinoCloudService] Inizio creazione...', rapportinoData);
        try {
            const dataToSend = cleanAndPrepareData(rapportinoData);
            logger.log('[rapportinoCloudService] Dati sterilizzati pronti per l\'invio (create):', dataToSend);
            const result = await gestisciRapportinoFunction({ operation: 'create', data: dataToSend });
            if (result.data.success) {
                logger.log(`[rapportinoCloudService] Creazione completata (ID: ${result.data.id}).`);
                return result.data.id;
            }
            throw new Error('La funzione cloud non ha restituito un successo.');
        } catch (error: any) {
            logger.error('[rapportinoCloudService] Errore creazione:', error);
            throw new Error(`Creazione fallita: ${error.message}`);
        }
    },

    async update(rapportinoData: Partial<Rapportino> & { id: string }): Promise<string> {
        logger.log(`[rapportinoCloudService] Inizio aggiornamento (ID: ${rapportinoData.id})...`, rapportinoData);
        try {
            const dataToSend = cleanAndPrepareData(rapportinoData);
            logger.log('[rapportinoCloudService] Dati sterilizzati pronti per l\'invio (update):', dataToSend);
            const result = await gestisciRapportinoFunction({ operation: 'update', data: dataToSend });
            if (result.data.success) {
                logger.log(`[rapportinoCloudService] Aggiornamento completato (ID: ${result.data.id}).`);
                return result.data.id;
            }
            throw new Error('La funzione cloud non ha restituito un successo.');
        } catch (error: any) {
            logger.error(`[rapportinoCloudService] Errore aggiornamento (ID: ${rapportinoData.id}):`, error);
            throw new Error(`Aggiornamento fallito: ${error.message}`);
        }
    },

    async delete(rapportinoId: string): Promise<string> {
        logger.log(`[rapportinoCloudService] Inizio soft delete (ID: ${rapportinoId})...`);
        try {
            const result = await gestisciRapportinoFunction({ operation: 'delete', data: { id: rapportinoId } });
            if (result.data.success) {
                logger.log(`[rapportinoCloudService] Soft delete completato (ID: ${result.data.id}).`);
                return result.data.id;
            }
            throw new Error('La funzione cloud non ha restituito un successo.');
        } catch (error: any) {
            logger.error(`[rapportinoCloudService] Errore soft delete (ID: ${rapportinoId}):`, error);
            throw new Error(`Soft delete fallito: ${error.message}`);
        }
    },

    async restore(rapportinoId: string): Promise<string> {
        logger.log(`[rapportinoCloudService] Inizio ripristino (ID: ${rapportinoId})...`);
        try {
            const result = await gestisciRapportinoFunction({ operation: 'restore', data: { id: rapportinoId } });
            if (result.data.success) {
                logger.log(`[rapportinoCloudService] Ripristino completato (ID: ${result.data.id}).`);
                return result.data.id;
            }
            throw new Error('La funzione cloud non ha restituito un successo.');
        } catch (error: any) {
            logger.error(`[rapportinoCloudService] Errore ripristino (ID: ${rapportinoId}):`, error);
            throw new Error(`Ripristino fallito: ${error.message}`);
        }
    },
};
