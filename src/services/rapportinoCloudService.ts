
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import type { Rapportino } from '@/models/definitions';

// Otteniamo le referenze alle nostre Cloud Functions deployate per i rapportini
const createRapportinoFn = httpsCallable(functions, 'createRapportino');
const updateRapportinoFn = httpsCallable(functions, 'updateRapportino');
const deleteRapportinoFn = httpsCallable(functions, 'deleteRapportino');

/**
 * Chiama la Cloud Function per creare un nuovo rapportino.
 * La funzione gestirà la logica di business, validazione e salvataggio sicuro.
 * @param data - I dati del rapportino da creare (senza id, che verrà generato o gestito dal backend).
 * @returns L'ID del nuovo rapportino.
 */
export const createRapportino = async (data: Partial<Rapportino>): Promise<{ id: string }> => {
    try {
        const result = await createRapportinoFn(data);
        return result.data as { id: string };
    } catch (error) {
        console.error("Errore durante la chiamata a createRapportino:", error);
        // Rilancio l'errore per permettere al SyncService di gestirlo (es. conflitti)
        throw error;
    }
};

/**
 * Chiama la Cloud Function per aggiornare un rapportino esistente.
 * La funzione gestirà la logica di business, validazione e salvataggio sicuro.
 * @param data - I dati da aggiornare, deve includere l'ID del rapportino.
 */
export const updateRapportino = async (data: Partial<Rapportino>): Promise<void> => {
    if (!data.id) {
        throw new Error("L'ID del rapportino è richiesto per l'aggiornamento.");
    }
    try {
        await updateRapportinoFn(data);
    } catch (error) {
        console.error("Errore durante la chiamata a updateRapportino:", error);
        throw error;
    }
};

/**
 * Chiama la Cloud Function per eliminare un rapportino.
 * @param id - L'ID del rapportino da eliminare.
 */
export const deleteRapportino = async (id: string): Promise<void> => {
    try {
        await deleteRapportinoFn({ id });
    } catch (error) {
        console.error("Errore durante la chiamata a deleteRapportino:", error);
        throw error;
    }
};
