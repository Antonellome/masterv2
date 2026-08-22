
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase'; // Corrected import path
import type { Rapportino } from '@/models/definitions';

// =============================================================================
// NUOVO SERVICE LAYER (FASE R.2) - UNIFICATO E SICURO
// Questo servizio utilizza le Cloud Functions SPECIFICHE e corrette, 
// garantendo che tutta la logica di business risieda sul backend.
// =============================================================================

// Definisce l'input parziale per creare/aggiornare un rapportino.
// Omettiamo i campi gestiti automaticamente dal backend.
type RapportinoInputData = Partial<Omit<Rapportino, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted'>>;

// --- DEFINIZIONE DELLE FUNZIONI SPECIALIZZATE ---

// Funzione per la creazione
const createRapportinoFunction = httpsCallable<RapportinoInputData, { id: string }>(functions, 'createRapportino');

// Funzione per l'aggiornamento. Il payload richiede l'ID e i dati da modificare.
const updateRapportinoFunction = httpsCallable<{ id: string } & RapportinoInputData, { success: boolean }>(functions, 'updateRapportino');

// Funzione per l'eliminazione (soft delete)
const deleteRapportinoFunction = httpsCallable<{ rapportinoId: string }, { success: boolean }>(functions, 'deleteRapportino');


/**
 * Servizio Cloud per la gestione centralizzata dei rapportini.
 * Interamente basato su Cloud Functions specializzate per massima sicurezza e coerenza.
 */
export const rapportinoCloudService = {
  /**
   * Crea un nuovo rapportino chiamando la funzione specializzata.
   * @param data L'oggetto rapportino da creare (senza campi di sistema).
   * @returns L'ID del rapportino appena creato.
   */
  create: async (data: RapportinoInputData): Promise<string> => {
    console.log("FASE R.2 -> Chiamata a 'createRapportino' con dati:", data);
    try {
      // Passiamo direttamente l'oggetto 'data', come si aspetta la funzione corretta.
      const result = await createRapportinoFunction(data);
      
      if (result.data.id) {
        console.log(`FASE R.2 -> Successo! Rapportino creato con ID: ${result.data.id}`);
        return result.data.id;
      } else {
        throw new Error("La Cloud Function 'createRapportino' non ha restituito un ID.");
      }
    } catch (error: any) {
      console.error("Errore DR CRITICO durante la chiamata a 'createRapportino':", error);
      throw new Error(`Creazione rapportino fallita: ${error.message}`);
    }
  },

  /**
   * Aggiorna un rapportino esistente chiamando la funzione specializzata.
   * @param id L'ID del rapportino da aggiornare.
   * @param data I campi del rapportino da aggiornare.
   */
  update: async (id: string, data: RapportinoInputData): Promise<void> => {
    console.log(`FASE R.2 -> Chiamata a 'updateRapportino' (id: ${id}) con dati:`, data);
    try {
      // Il payload è un oggetto contenente sia l'id che i dati
      const result = await updateRapportinoFunction({ id, ...data });

      if (!result.data.success) {
        throw new Error("La Cloud Function 'updateRapportino' ha segnalato un fallimento.");
      }
       console.log(`FASE R.2 -> Successo! Rapportino ${id} aggiornato.`);
    } catch (error: any) {
      console.error(`Errore DR CRITICO durante la chiamata a 'updateRapportino':`, error);
      throw new Error(`Aggiornamento rapportino (id: ${id}) fallito: ${error.message}`);
    }
  },

  /**
   * Elimina (soft delete) un rapportino chiamando la funzione specializzata.
   * @param id L'ID del rapportino da eliminare.
   */
  delete: async (id: string): Promise<void> => {
    console.log(`FASE R.2 -> Chiamata a 'deleteRapportino' (id: ${id})`);
     try {
       const result = await deleteRapportinoFunction({ rapportinoId: id });

       if (!result.data.success) {
         throw new Error("La Cloud Function 'deleteRapportino' ha segnalato un fallimento.");
       }
       console.log(`FASE R.2 -> Successo! Rapportino ${id} marcato come eliminato.`);
    } catch (error: any) {
      console.error(`Errore DR CRITICO durante la chiamata a 'deleteRapportino':`, error);
      throw new Error(`Eliminazione rapportino (id: ${id}) fallita: ${error.message}`);
    }
  }
};
