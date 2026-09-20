
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import { logger } from '@/utils/logger';
import type { Rapportino } from '@/models/definitions';

// Definiamo la firma della nostra Cloud Function
const gestisciRapportinoFunction = httpsCallable<{
    operation: 'create' | 'update' | 'delete';
    data: Partial<Rapportino> & { id?: string };
}, { success: boolean; id: string }> (functions, 'master_gestisciRapportino');


/**
 * Servizio per interagire con la Cloud Function `master_gestisciRapportino`.
 * Implementa il Modello Ibrido: Scrittura via Cloud Function -> Sincronizzazione locale.
 */
export const rapportinoCloudService = {

    /**
     * Crea un nuovo rapportino.
     * @param rapportinoData I dati del rapportino da creare.
     * @returns L'ID del nuovo rapportino.
     */
    async create(rapportinoData: Partial<Rapportino>): Promise<string> {
        logger.log('[rapportinoCloudService] Inizio creazione rapportino...', rapportinoData);
        try {
            const result = await gestisciRapportinoFunction({ operation: 'create', data: rapportinoData });
            if (result.data.success) {
                logger.log(`[rapportinoCloudService] Creazione completata (ID: ${result.data.id}). Avvio sincronizzazione...`);
                await useGlobalStore.getState().syncCollectionByName('rapportini');
                logger.log('[rapportinoCloudService] Sincronizzazione post-creazione completata.');
                return result.data.id;
            }
            throw new Error('La funzione cloud non ha restituito un successo.');
        } catch (error) {
            logger.error('[rapportinoCloudService] Errore durante la creazione del rapportino:', error);
            throw new Error(`Creazione fallita: ${error.message}`);
        }
    },

    /**
     * Aggiorna un rapportino esistente.
     * @param rapportinoData I dati da aggiornare. Deve includere l'ID.
     * @returns L'ID del rapportino aggiornato.
     */
    async update(rapportinoData: Partial<Rapportino> & { id: string }): Promise<string> {
        logger.log(`[rapportinoCloudService] Inizio aggiornamento rapportino (ID: ${rapportinoData.id})...`, rapportinoData);
        try {
            const result = await gestisciRapportinoFunction({ operation: 'update', data: rapportinoData });
            if (result.data.success) {
                logger.log(`[rapportinoCloudService] Aggiornamento completato (ID: ${result.data.id}). Avvio sincronizzazione...`);
                await useGlobalStore.getState().syncCollectionByName('rapportini');
                logger.log('[rapportinoCloudService] Sincronizzazione post-aggiornamento completata.');
                return result.data.id;
            }
            throw new Error('La funzione cloud non ha restituito un successo.');
        } catch (error) {
            logger.error(`[rapportinoCloudService] Errore durante l'aggiornamento del rapportino (ID: ${rapportinoData.id}):`, error);
            throw new Error(`Aggiornamento fallito: ${error.message}`);
        }
    },

    /**
     * Esegue un soft delete di un rapportino (lo marca come 'deleted: true').
     * @param rapportinoId L'ID del rapportino da eliminare.
     * @returns L'ID del rapportino eliminato.
     */
    async delete(rapportinoId: string): Promise<string> {
        logger.log(`[rapportinoCloudService] Inizio soft delete rapportino (ID: ${rapportinoId})...`);
        try {
            const result = await gestisciRapportinoFunction({ operation: 'delete', data: { id: rapportinoId } });
            if (result.data.success) {
                logger.log(`[rapportinoCloudService] Soft delete completato (ID: ${result.data.id}). Avvio sincronizzazione...`);
                await useGlobalStore.getState().syncCollectionByName('rapportini');
                logger.log('[rapportinoCloudService] Sincronizzazione post-delete completata.');
                return result.data.id;
            }
            throw new Error('La funzione cloud non ha restituito un successo.');
        } catch (error) {
            logger.error(`[rapportinoCloudService] Errore durante il soft delete del rapportino (ID: ${rapportinoId}):`, error);
            throw new Error(`Soft delete fallito: ${error.message}`);
        }
    },
};
