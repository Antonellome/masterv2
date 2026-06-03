
import { doc, getDoc, setDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { RapportinoSchema } from '@/models/rapportino.schema';
import { rapportinoConverter } from '@/utils/converters/rapportinoConverter';

const rapportiniCollection = collection(db, 'rapportini').withConverter(rapportinoConverter);

/**
 * Salva un rapportino (crea o aggiorna) in Firestore.
 * @param rapportino L'oggetto rapportino validato secondo RapportinoSchema.
 * @throws Lancia un errore se il salvataggio fallisce.
 */
export const saveRapportino = async (rapportino: RapportinoSchema): Promise<void> => {
    try {
        const docRef = doc(rapportiniCollection, rapportino.id);

        // Distinguiamo tra creazione e aggiornamento per i metadati
        const isEditMode = (await getDoc(docRef)).exists();

        if (isEditMode) {
            // Aggiornamento
            const dataToUpdate: Partial<RapportinoSchema> = {
                ...rapportino,
                metadata: {
                    ...rapportino.metadata,
                    updatedAt: Timestamp.now(),
                    // updatedBy: currentUser.uid // Da implementare se necessario
                },
            };
            await setDoc(docRef, dataToUpdate, { merge: true });
        } else {
            // Creazione
            await setDoc(docRef, rapportino); // Lo schema Zod ha già i default
        }
    } catch (error) {
        console.error("Errore durante il salvataggio del rapportino:", error);
        throw new Error("Impossibile salvare il rapportino.");
    }
};

/**
 * Recupera un singolo rapportino da Firestore usando il suo ID.
 * @param id L'ID del rapportino da recuperare.
 * @returns L'oggetto RapportinoSchema o null se non trovato.
 * @throws Lancia un errore se il recupero fallisce.
 */
export const getRapportinoById = async (id: string): Promise<RapportinoSchema | null> => {
    try {
        const docRef = doc(rapportiniCollection, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Errore durante il recupero del rapportino:", error);
        throw new Error("Impossibile recuperare il rapportino.");
    }
};
