
import { db as dexieDb } from '@/db/db';
import { pushRapportinoToQueue } from './SyncService'; // Importo la funzione corretta per la coda
import type { Rapportino } from '@/models/definitions';

/**
 * Salva un rapportino, marcandolo come 'dirty' e accodandolo per la sincronizzazione.
 * L'operazione è istantanea per l'UI.
 * @param rapportino L'oggetto rapportino da salvare.
 * @throws Lancia un errore se il salvataggio locale fallisce.
 */
export const saveRapportino = async (rapportino: Rapportino): Promise<void> => {
    try {
        if (!rapportino.id) {
            throw new Error('ID del rapportino non fornito per il salvataggio.');
        }

        // 1. Marca il rapportino come 'dirty' e salvalo localmente
        const dirtyRapportino = {
            ...rapportino,
            isDirty: 1 as const // Aggiungo il flag
        };
        await dexieDb.rapportini.put(dirtyRapportino);

        // 2. Aggiungi il rapportino alla coda di sincronizzazione (operazione veloce)
        await pushRapportinoToQueue(rapportino.id);

    } catch (error) {
        console.error("Errore durante il salvataggio del rapportino (locale):", error);
        throw new Error("Impossibile salvare il rapportino localmente.");
    }
};

/**
 * Recupera un singolo rapportino dal database locale (Dexie).
 * @param id L'ID del rapportino da recuperare.
 * @returns L'oggetto Rapportino o undefined se non trovato.
 */
export const getRapportinoById = async (id: string): Promise<Rapportino | undefined> => {
    try {
        return await dexieDb.rapportini.get(id);
    } catch (error) {
        console.error("Errore durante il recupero del rapportino locale:", error);
        throw new Error("Impossibile recuperare il rapportino dal database locale.");
    }
};
