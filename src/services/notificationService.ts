
import { functions } from '@/config/firebase'; // CORRECTED IMPORT PATH
import { httpsCallable } from 'firebase/functions';
import { Notifica } from '@/models/definitions'; 

// --- Callable Functions ---
const getNotificheCallable = httpsCallable(functions, 'getNotifiche');
const markNotificheAsReadCallable = httpsCallable(functions, 'markNotificheAsRead');
const deleteNotificheCallable = httpsCallable(functions, 'deleteNotifiche');
const deleteNotificationBatchCallable = httpsCallable(functions, 'deleteNotificationBatch');

/**
 * Recupera l'elenco completo delle notifiche per l'utente autenticato.
 */
export const getNotifiche = async (): Promise<Notifica[]> => {
    try {
        const result = await getNotificheCallable();
        const data = result.data as { notifiche: Notifica[] };
        return data.notifiche;
    } catch (error) {
        console.error("Errore durante il recupero delle notifiche:", error);
        throw new Error("Impossibile caricare le notifiche.");
    }
};

/**
 * Segna una o più notifiche come lette.
 * @param notificaIds - Un array di ID delle notifiche da marcare.
 */
export const markNotificheAsRead = async (notificaIds: string[]): Promise<void> => {
    if (notificaIds.length === 0) return;
    try {
        await markNotificheAsReadCallable({ notificaIds });
    } catch (error) {
        console.error("Errore durante l'aggiornamento delle notifiche:", error);
        throw new Error("Impossibile segnare le notifiche come lette.");
    }
};

/**
 * Elimina una o più notifiche specifiche.
 * @param notificaIds - Un array di ID delle notifiche da eliminare.
 */
export const deleteNotifiche = async (notificaIds: string[]): Promise<void> => {
    if (notificaIds.length === 0) return;
    try {
        await deleteNotificheCallable({ notificaIds });
    } catch (error) {
        console.error("Errore durante l'eliminazione delle notifiche:", error);
        throw new Error("Impossibile eliminare le notifiche selezionate.");
    }
};

/**
 * Elimina un intero lotto di notifiche (per Admin).
 */
export const deleteNotificationBatch = async (): Promise<void> => {
    try {
        // Chiamata senza parametri, come da ultima implementazione della CF
        await deleteNotificationBatchCallable({}); 
    } catch (error) {
        console.error("Errore durante l'eliminazione del lotto di notifiche:", error);
        throw new Error("Impossibile eliminare il lotto di notifiche.");
    }
};
