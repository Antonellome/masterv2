import { db } from '@/db/db';
import { Rapportino } from '@/models/definitions';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Salva un rapportino (nuovo o esistente) nel database locale.
 * 
 * - Se il rapportino non ha un ID, ne genera uno nuovo (creazione).
 * - Imposta i metadati `updatedAt`, `updatedBy`.
 * - Marca il record come 'dirty' per la successiva sincronizzazione.
 * 
 * @param rapportino L'oggetto Rapportino da salvare.
 * @returns L'ID del rapportino salvato.
 */
export const save = async (rapportino: Partial<Rapportino>): Promise<string> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Utente non autenticato. Impossibile salvare il rapportino.");
  }

  const isNew = !rapportino.id;
  const now = new Date();

  const rapportinoToSave: Rapportino = {
    ...(isNew 
      ? { 
          id: uuidv4(), 
          createdAt: now, 
          createdBy: currentUser.uid,
          version: 1, // Prima versione
          isLocked: false, // Non bloccato alla creazione
          presenze: [],
          dettaglioOre: [],
          lavoroEseguito: '',
          includeTrasferta: false,
          ...rapportino as Partial<Rapportino> 
        }
      : rapportino as Rapportino),
    updatedAt: now,
    updatedBy: currentUser.uid,
    isDirty: 1, // Marca per la sincronizzazione
    isDeleted: 0, // Assicura che non sia marcato per la cancellazione
  };

  await db.rapportini.put(rapportinoToSave);

  return rapportinoToSave.id!;
};

/**
 * Esegue un "soft delete" di un rapportino nel database locale.
 * 
 * - Non cancella fisicamente il record, ma lo marca come `isDeleted: 1`.
 * - Marca il record come 'dirty' per permettere la sincronizzazione della cancellazione.
 * 
 * @param rapportinoId L'ID del rapportino da eliminare.
 */
export const remove = async (rapportinoId: string): Promise<void> => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
  
    if (!currentUser) {
      throw new Error("Utente non autenticato. Impossibile eliminare il rapportino.");
    }

  const rapportino = await db.rapportini.get(rapportinoId);

  if (rapportino) {
    await db.rapportini.put({
      ...rapportino,
      updatedAt: new Date(),
      updatedBy: currentUser.uid,
      isDeleted: 1,
      isDirty: 1, // Marca per la sincronizzazione della cancellazione
    });
  }
};
