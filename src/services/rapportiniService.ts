
import { doc, getDoc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { RapportinoSchema } from '@/models/rapportino.schema';
import { rapportinoConverter } from '@/utils/converters/rapportinoConverter';

export const rapportiniCollection = collection(db, 'rapportini').withConverter(rapportinoConverter);

/**
 * Salva un rapportino (crea o aggiorna) in Firestore.
 * L'operazione SOVRASCRIVE completamente il documento esistente per garantire la pulizia dei dati.
 * @param rapportino L'oggetto rapportino conforme a RapportinoSchema.
 * @throws Lancia un errore se il salvataggio fallisce.
 */
export const saveRapportino = async (rapportino: RapportinoSchema): Promise<void> => {
    try {
        if (!rapportino.id) {
            throw new Error('ID del rapportino non fornito per il salvataggio.');
        }
        const docRef = doc(rapportiniCollection, rapportino.id);

        // L'operazione di setDoc senza merge SOVRASCRIVE il documento.
        // Questo elimina qualsiasi campo residuo da salvataggi precedenti e garantisce
        // che solo i dati conformi allo schema attuale vengano persistiti.
        await setDoc(docRef, rapportino);

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
