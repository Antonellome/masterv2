
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import { 
    Cliente, Ditta, Luogo, Nave, Rapportino, Tecnico, TipoGiornata, Veicolo 
} from '@/models/definitions';

// ======== PARTE VECCHIA (MANTENUTA PER COMPATIBILITÀ) ========

type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'partecipanti'>;
type UpdateInput<T> = { id: string; data: Partial<CreateInput<T>> };
type DeleteInput = { id: string };

const oldGenericCreate = <T>(resourceName: string) => httpsCallable<CreateInput<T>, { id: string }>(functions, `create${resourceName}`);
const oldGenericUpdate = <T>(resourceName: string) => httpsCallable<UpdateInput<T>, void>(functions, `update${resourceName}`);
const oldGenericDelete = (resourceName: string) => httpsCallable<DeleteInput, void>(functions, `delete${resourceName}`);

const createApiService = <T extends { id: string }>(resourceName: Capitalize<string>) => {
    const createFn = oldGenericCreate<T>(resourceName);
    const updateFn = oldGenericUpdate<T>(resourceName);
    const deleteFn = oldGenericDelete(resourceName);

    return {
        create: async (data: CreateInput<T>): Promise<string> => {
            console.log(`[API-Legacy] Chiamata a create${resourceName}`, data);
            const result = await createFn(data);
            return result.data.id;
        },
        update: async (id: string, data: Partial<CreateInput<T>>): Promise<void> => {
            await updateFn({ id, data });
        },
        delete: async (id: string): Promise<void> => {
            await deleteFn({ id });
        },
    };
};

// ======== NUOVA ARCHITETTURA IBRIDA (MODELLO GENERICO) ========

const createDocCallable = httpsCallable(functions, 'createDocument');
const updateDocCallable = httpsCallable(functions, 'updateDocument');
const deleteDocCallable = httpsCallable(functions, 'deleteDocument');

const genericApiService = {
    create: async (collectionName: string, docData: any): Promise<string> => {
        console.log(`[API-Generic] Chiamata a createDocument su ${collectionName}`, docData);
        try {
            const result = await createDocCallable({ collection: collectionName, docData });
            useGlobalStore.getState().showNotification(`${collectionName} creato con successo`, 'success');
            return (result.data as { id: string }).id;
        } catch (error: any) {
            console.error(`[API-Generic] Errore in createDocument su ${collectionName}:`, error);
            useGlobalStore.getState().showNotification(`Creazione fallita: ${error.message}`, 'error');
            throw error;
        }
    },
    update: async (collectionName: string, docId: string, docData: any): Promise<void> => {
        console.log(`[API-Generic] Chiamata a updateDocument su ${collectionName} (ID: ${docId})`, docData);
        try {
            await updateDocCallable({ collection: collectionName, docId, docData });
            useGlobalStore.getState().showNotification(`${collectionName} aggiornato con successo`, 'success');
        } catch (error: any) {
            console.error(`[API-Generic] Errore in updateDocument su ${collectionName}:`, error);
            useGlobalStore.getState().showNotification(`Aggiornamento fallito: ${error.message}`, 'error');
            throw error;
        }
    },
    delete: async (collectionName: string, docId: string): Promise<void> => {
        console.log(`[API-Generic] Chiamata a deleteDocument su ${collectionName} (ID: ${docId})`);
        try {
            await deleteDocCallable({ collection: collectionName, docId });
            useGlobalStore.getState().showNotification(`${collectionName} eliminato con successo`, 'success');
        } catch (error: any) {
            console.error(`[API-Generic] Errore in deleteDocument su ${collectionName}:`, error);
            useGlobalStore.getState().showNotification(`Eliminazione fallita: ${error.message}`, 'error');
            throw error;
        }
    },
};


// ========= ESPORTAZIONE UNIFICATA (IBRIDA) ==========

export const api = {
    // Servizi specifici legacy (mantenuti per logica complessa)
    ditte: createApiService<Ditta>('Ditta'),
    clienti: createApiService<Cliente>('Cliente'),
    rapportini: createApiService<Rapportino>('Rapportino'),
    tecnici: createApiService<Tecnico>('Tecnico'),
    veicoli: createApiService<Veicolo>('Veicolo'),

    // Nuovo servizio generico per tutte le anagrafiche semplici
    generic: genericApiService,
};
