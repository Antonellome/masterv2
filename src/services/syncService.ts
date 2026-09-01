import { getFunctions, httpsCallable } from 'firebase/functions';
import { logger } from '@/utils/logger';

const functions = getFunctions();

// Mappatura tra operazione e nome della Cloud Function
const functionMap = {
    anagrafiche: {
        create: 'createAnagrafica',
        update: 'updateAnagrafica',
        delete: 'deleteAnagrafica',
    },
    // ... qui verranno aggiunte le altre collection (documenti, rapportini, etc.)
};

/**
 * Funzione generica per la sincronizzazione con il backend.
 * @param operation - L'operazione da eseguire ('create', 'update', 'delete').
 * @param collectionName - Il nome della "super-collezione" (es. 'anagrafiche').
 * @param data - L'oggetto di dati per la funzione.
 *             Per 'create': { collection: string, payload: object }
 *             Per 'update': { collection: string, id: string, payload: object }
 *             Per 'delete': { collection: string, id: string }
 */
export const syncService = {
    async sync(operation: 'create' | 'update' | 'delete', collectionName: keyof typeof functionMap, data: any) {
        const functionName = functionMap[collectionName]?.[operation];

        if (!functionName) {
            const errorMsg = `Nessuna Cloud Function mappata per: ${collectionName}.${operation}`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        try {
            logger.log(`[Sync Service] Chiamo la Cloud Function '${functionName}' con i dati:`, data);
            const callable = httpsCallable(functions, functionName);
            const result = await callable(data);
            logger.log(`[Sync Service] Risultato da '${functionName}':`, result.data);
            return result.data;
        } catch (error) {
            logger.error(`[Sync Service] Errore durante la chiamata a '${functionName}':`, error);
            // In un'app reale, qui gestirei il fallimento (es. riprovare più tardi)
            throw error;
        }
    }
};
