
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import { logger } from '@/utils/logger';

// Definiamo un tipo più stretto per le operazioni
type TecnicoOperation = 'create' | 'update' | 'toggle-active';

// La callable function si aspetta un payload con 'operation' e 'data'
const gestisciTecnicoCallable = httpsCallable<{ operation: TecnicoOperation, data: any }, { success: boolean; uid?: string }>(functions, 'master_gestisciTecnico');

/**
 * Servizio per la gestione dei tecnici. Funge da intermediario tra i componenti UI
 * e la Cloud Function 'master_gestisciTecnico', passando direttamente il payload.
 *
 * @param operation L'operazione richiesta ('create', 'update', 'toggle-active').
 * @param data I dati necessari per l'operazione, già formattati dal componente chiamante.
 */
export const tecniciService = async (operation: TecnicoOperation, data: any) => {
  const payload = { operation, data };
  
  try {
    logger.log(`[TecniciService] Chiamata a 'master_gestisciTecnico' con payload:`, payload);
    const result = await gestisciTecnicoCallable(payload);
    logger.log(`[TecniciService] Risultato dalla CF:`, result.data);

    if (result.data.success) {
      logger.log(`[TecniciService] Operazione ${operation} riuscita. Avvio sync 'tecnici'.`);
      // Sincronizza la tabella 'tecnici' per riflettere le modifiche localmente.
      await useGlobalStore.getState().syncCollectionByName('tecnici' as any);
    } else {
      // Questo errore ora dovrebbe essere più specifico, provenendo direttamente dalla CF
      throw new Error(`L'operazione ${operation} è fallita sul server.`);
    }

    return result.data;

  } catch (error) {
    const typedError = error as Error;
    logger.error(`[TecniciService] Errore durante l'operazione '${operation}' per il tecnico con ID: ${data.id ?? data.uid}. Dettagli:`, typedError.message);
    useGlobalStore.getState().showNotification(`Errore durante l'operazione: ${typedError.message}`, 'error');
    // Rilancia l'errore per permettere al componente di gestire lo stato (es. isSaving)
    throw error;
  }
};

// --- GESTIONE RESET PASSWORD ---

const resetPasswordTecnicoCallable = httpsCallable<{ email: string }, { success: boolean }>(functions, 'master_resetPasswordTecnico');

/**
 * Servizio per richiedere il reset della password di un tecnico.
 *
 * @param email L'email del tecnico.
 */
export const resetPasswordTecnico = async (email: string) => {
  try {
    logger.log(`[TecniciService] Richiesta reset password per: ${email}`);
    const result = await resetPasswordTecnicoCallable({ email });
    logger.log(`[TecniciService] Risultato reset password:`, result.data);
    
    if(result.data.success){
        useGlobalStore.getState().showNotification(`Link di reset inviato a ${email}.`, 'success');
    } else {
        throw new Error('La richiesta di reset password è fallita sul server.');
    }

    return result.data;
  } catch (error) {
    const typedError = error as Error;
    logger.error(`[TecniciService] Errore durante il reset password per ${email}:`, typedError.message);
    useGlobalStore.getState().showNotification(`Errore reset password: ${typedError.message}`, 'error');
    throw error;
  }
};
