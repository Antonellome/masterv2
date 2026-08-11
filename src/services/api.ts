
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import { 
    Cliente, Ditta, Luogo, Nave, Rapportino, Tecnico, TipoGiornata, Veicolo 
} from '@/models/definitions';

// TIPI GENERICI PER LE FUNZIONI CLOUD
type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'partecipanti'>;
type UpdateInput<T> = { id: string; data: Partial<CreateInput<T>> };
type DeleteInput = { id: string };

// FUNZIONI CALLABLE GENERICHE
const genericCreate = <T>(resourceName: string) => httpsCallable<CreateInput<T>, { id: string }>(functions, `create${resourceName}`);
const genericUpdate = <T>(resourceName: string) => httpsCallable<UpdateInput<T>, void>(functions, `update${resourceName}`);
const genericDelete = (resourceName: string) => httpsCallable<DeleteInput, void>(functions, `delete${resourceName}`);

// SERVIZIO API UNIFICATO
const createApiService = <T extends { id: string }>(resourceName: Capitalize<string>) => {
    const createFn = genericCreate<T>(resourceName);
    const updateFn = genericUpdate<T>(resourceName);
    const deleteFn = genericDelete(resourceName);

    return {
        create: async (data: CreateInput<T>): Promise<string> => {
            console.log(`[API] Chiamata a create${resourceName}`, data);
            try {
                const result = await createFn(data);
                useGlobalStore.getState().showNotification(`${resourceName} creato con successo`, 'success');
                return result.data.id;
            } catch (error: any) {
                console.error(`[API] Errore in create${resourceName}:`, error);
                useGlobalStore.getState().showNotification(`Creazione ${resourceName} fallita: ${error.message}`, 'error');
                throw error;
            }
        },
        update: async (id: string, data: Partial<CreateInput<T>>): Promise<void> => {
            console.log(`[API] Chiamata a update${resourceName} (ID: ${id})`, data);
            try {
                await updateFn({ id, data });
                 useGlobalStore.getState().showNotification(`${resourceName} aggiornato con successo`, 'success');
            } catch (error: any) {
                console.error(`[API] Errore in update${resourceName}:`, error);
                useGlobalStore.getState().showNotification(`Aggiornamento ${resourceName} fallito: ${error.message}`, 'error');
                throw error;
            }
        },
        delete: async (id: string): Promise<void> => {
            console.log(`[API] Chiamata a delete${resourceName} (ID: ${id})`);
            try {
                await deleteFn({ id });
                useGlobalStore.getState().showNotification(`${resourceName} eliminato con successo`, 'success');
            } catch (error: any) {
                console.error(`[API] Errore in delete${resourceName}:`, error);
                useGlobalStore.getState().showNotification(`Eliminazione ${resourceName} fallita: ${error.message}`, 'error');
                throw error;
            }
        },
    };
};

// Esportiamo un'istanza del servizio per ogni risorsa gestita da Cloud Functions
export const api = {
    ditte: createApiService<Ditta>('Ditta'),
    clienti: createApiService<Cliente>('Cliente'),
    rapportini: createApiService<Rapportino>('Rapportino'),
    tecnici: createApiService<Tecnico>('Tecnico'),
    veicoli: createApiService<Veicolo>('Veicolo'),
    // Nota: Non tutte le risorse hanno endpoint CRUD. Aggiungere solo quelle necessarie.
}; 
