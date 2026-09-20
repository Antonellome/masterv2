import { getFunctions, httpsCallable } from 'firebase/functions';
import { Tecnico } from '@/models/definitions';
import { useGlobalStore } from '@/stores/globalStore';
import { logger } from '@/utils/logger';

const functions = getFunctions();

// --- TIPIZZAZIONE DELLE RICHIESTE ---

interface GestisciTecnicoBaseRequest {
  operation: 'create' | 'update' | 'toggle-active' | 'toggle-access'; // Corrisponde alle operazioni della CF
  data: any;
}

// Callable Function per la gestione dei tecnici
const gestisciTecnicoCallable = httpsCallable<GestisciTecnicoBaseRequest, { success: boolean; id?: string }>(functions, 'master_gestisciTecnico');

/**
 * Servizio per la gestione dei tecnici, allineato con il Modello Ibrido.
 * Esegue l'operazione di scrittura tramite Cloud Function e avvia la sincronizzazione
 * della tabella 'tecnici' per aggiornare la cache locale (Dexie).
 *
 * @param operation L'operazione richiesta dalla Cloud Function.
 * @param data I dati necessari per l'operazione.
 */
export const tecniciService = async (operation: GestisciTecnicoBaseRequest['operation'], data: any) => {
  const payload: GestisciTecnicoBaseRequest = { operation, data };
  
  try {
    logger.log(`[TecniciService] Invio payload alla CF 'master_gestisciTecnico':`, payload);
    const result = await gestisciTecnicoCallable(payload);
    logger.log(`[TecniciService] Risultato dalla CF:`, result.data);

    if (result.data.success) {
      logger.log(`[TecniciService] Operazione ${operation} su tecnico (ID: ${data.id}) riuscita. Avvio sync mirato.`);
      // Avvia la sincronizzazione della tabella 'tecnici' dopo l'operazione
      await useGlobalStore.getState().syncCollectionByName('tecnici' as any);
    } else {
      throw new Error(`L'operazione ${operation} per il tecnico (ID: ${data.id}) è fallita sul server.`);
    }

    return result.data;

  } catch (error) {
    const typedError = error as Error;
    logger.error(`[TecniciService] Errore durante l'operazione '${operation}':`, typedError.message);
    useGlobalStore.getState().showNotification(`Errore gestione tecnico: ${typedError.message}`, 'error');
    throw error;
  }
};

// --- GESTIONE RESET PASSWORD (Non richiede sync) ---

const resetPasswordTecnicoCallable = httpsCallable<{ email: string }, { success: boolean; link?: string }>(functions, 'master_resetPasswordTecnico');

/**
 * Servizio per richiedere il reset della password di un tecnico.
 * Chiama la Cloud Function dedicata che invierà l'email di reset.
 *
 * @param email L'email del tecnico di cui resettare la password.
 */
export const resetPasswordTecnico = async (email: string) => {
  try {
    logger.log(`[TecniciService] Richiesta reset password per: ${email}`);
    const result = await resetPasswordTecnicoCallable({ email });
    logger.log(`[TecniciService] Risultato reset password:`, result.data);
    
    if(result.data.success){
        useGlobalStore.getState().showNotification(`Link di reset inviato a ${email}`, 'success');
    } else {
        throw new Error('Richiesta di reset fallita sul server.');
    }

    return result.data;
  } catch (error) {
    const typedError = error as Error;
    logger.error(`[TecniciService] Errore durante il reset password per ${email}:`, typedError.message);
    useGlobalStore.getState().showNotification(`Errore reset password: ${typedError.message}`, 'error');
    throw error;
  }
};
