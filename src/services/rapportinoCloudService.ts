
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import type { Rapportino } from '@/models/definitions';

// Definiamo un tipo per l'input della funzione, che è un Rapportino parziale
// senza i campi gestiti dal server (come id, createdAt, updatedAt)
type RapportinoInputData = Partial<Omit<Rapportino, 'id' | 'createdAt' | 'updatedAt'>>;

const createRapportinoCloud = httpsCallable<RapportinoInputData, { id: string }>(functions, 'createRapportino');
const updateRapportinoCloud = httpsCallable<{ id: string; data: RapportinoInputData }, void>(functions, 'updateRapportino');
const deleteRapportinoCloud = httpsCallable<{ id: string }, void>(functions, 'deleteRapportino');

export const rapportinoCloudService = {
  create: async (data: RapportinoInputData) => {
    console.log("Invio a Cloud Function 'createRapportino':", data);
    try {
      const result = await createRapportinoCloud(data);
      console.log("Risposta da 'createRapportino':", result.data.id);
      return result.data.id;
    } catch (error) {
      console.error("Errore durante la chiamata a createRapportino:", error);
      throw new Error("La creazione del rapportino sul server è fallita.");
    }
  },

  update: async (id: string, data: RapportinoInputData) => {
    console.log(`Invio a Cloud Function 'updateRapportino' (id: ${id}):`, data);
    try {
      await updateRapportinoCloud({ id, data });
      console.log("Risposta da 'updateRapportino' ricevuta.");
    } catch (error) {
      console.error("Errore durante la chiamata a updateRapportino:", error);
      throw new Error("L'aggiornamento del rapportino sul server è fallito.");
    }
  },

  delete: async (id: string) => {
    console.log(`Invio a Cloud Function 'deleteRapportino' (id: ${id})`);
     try {
      await deleteRapportinoCloud({ id });
      console.log("Risposta da 'deleteRapportino' ricevuta.");
    } catch (error) {
      console.error("Errore durante la chiamata a deleteRapportino:", error);
      throw new Error("L'eliminazione del rapportino sul server è fallita.");
    }
  }
};
