
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { logger } from '@/utils/logger';
import type { Rapportino } from '@/models/definitions';

// Aggiungiamo 'restore' alla firma della funzione
const gestisciRapportinoFunction = httpsCallable<{
    operation: 'create' | 'update' | 'delete' | 'restore';
    data: Partial<Rapportino> & { id?: string };
}, { success: boolean; id: string }> (functions, 'master_gestisciRapportino');


export const rapportinoCloudService = {

    async create(rapportinoData: Partial<Rapportino>): Promise<string> {
        logger.log('[rapportinoCloudService] Inizio creazione...', rapportinoData);
        try {
            const result = await gestisciRapportinoFunction({ operation: 'create', data: rapportinoData });
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
            const result = await gestisciRapportinoFunction({ operation: 'update', data: rapportinoData });
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
            // La chiamata al server viene fatta, ma NON esegue più una sincronizzazione.
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
            // La chiamata al server viene fatta, ma NON esegue più una sincronizzazione.
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
