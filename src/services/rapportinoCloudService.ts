
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase'; // Assicura che questo punti alla tua istanza di functions
import type { Rapportino } from '@/models/definitions';

// Definisce l'input parziale per creare/aggiornare un rapportino.
type RapportinoInputData = Partial<Omit<Rapportino, 'id' | 'createdAt' | 'updatedAt'>>;

// Definisce la struttura del payload per la nostra funzione UNIFICATA
interface ManageRapportinoPayload {
  action: 'create' | 'update' | 'delete';
  id?: string; // Obbligatorio per update e delete
  data?: RapportinoInputData; // Obbligatorio per create e update
}

// Definisce la struttura della risposta attesa
interface ManageRapportinoResponse {
  success: boolean;
  message?: string;
  rapportinoId?: string; 
}

// La singola funzione callable che punta al nostro nuovo endpoint UNIFICATO
const manageRapportino = httpsCallable<ManageRapportinoPayload, ManageRapportinoResponse>(functions, 'manageRapportino');

/**
 * Servizio Cloud per la gestione centralizzata dei rapportini.
 * Utilizza una singola Cloud Function (manageRapportino) con diverse azioni.
 */
export const rapportinoCloudService = {
  /**
   * Crea un nuovo rapportino.
   * @param data L'oggetto rapportino da creare.
   * @returns L'ID del rapportino creato.
   */
  create: async (data: RapportinoInputData): Promise<string> => {
    console.log("Invio a 'manageRapportino' [create]:", data);
    try {
      const result = await manageRapportino({
        action: 'create',
        data: data,
      });

      if (result.data.success && result.data.rapportinoId) {
        return result.data.rapportinoId;
      } else {
        throw new Error(result.data.message || "La funzione cloud non ha restituito un ID per il rapportino.");
      }
    } catch (error: any) {
      console.error("Errore durante la chiamata a 'manageRapportino' [create]:", error);
      throw new Error(`Creazione rapportino fallita: ${error.message}`);
    }
  },

  /**
   * Aggiorna un rapportino esistente.
   * @param id L'ID del rapportino da aggiornare.
   * @param data I campi del rapportino da aggiornare.
   */
  update: async (id: string, data: RapportinoInputData): Promise<void> => {
    console.log(`Invio a 'manageRapportino' [update] (id: ${id}):`, data);
    try {
      const result = await manageRapportino({
        action: 'update',
        id: id,
        data: data,
      });

      if (!result.data.success) {
        throw new Error(result.data.message || "L'aggiornamento è fallito senza un messaggio specifico.");
      }
    } catch (error: any) {
      console.error(`Errore durante la chiamata a 'manageRapportino' [update]:`, error);
      throw new Error(`Aggiornamento rapportino (id: ${id}) fallito: ${error.message}`);
    }
  },

  /**
   * Elimina un rapportino (soft delete).
   * @param id L'ID del rapportino da eliminare.
   */
  delete: async (id: string): Promise<void> => {
    console.log(`Invio a 'manageRapportino' [delete] (id: ${id})`);
     try {
       const result = await manageRapportino({
         action: 'delete',
         id: id,
       });
       if (!result.data.success) {
         throw new Error(result.data.message || "L'eliminazione è fallita senza un messaggio specifico.");
       }
    } catch (error: any) {
      console.error(`Errore durante la chiamata a 'manageRapportino' [delete]:`, error);
      throw new Error(`Eliminazione rapportino (id: ${id}) fallita: ${error.message}`);
    }
  }
};
