
import { doc, setDoc, deleteDoc, Timestamp, collection } from 'firebase/firestore';
import { db } from '@/firebase'; 
import { dexieDB } from '@/db/dexieDB';
import type { TipoGiornata } from '@/models/definitions';
import { v4 as uuidv4 } from 'uuid';

const TIPI_GIORNATA_COLLECTION = 'tipiGiornata';

/**
 * Salva (crea o aggiorna) una tipologia di giornata.
 * 
 * @param tipoGiornataData L'oggetto parziale o completo del tipo giornata da salvare.
 * @returns L'ID del documento salvato.
 */
export const saveTipoGiornata = async (tipoGiornataData: Partial<TipoGiornata>): Promise<string> => {
    const id = tipoGiornataData.id || uuidv4();
    
    const docToSave: TipoGiornata = {
        // Valori di default se non forniti
        nome: '',
        tariffa: 0,
        tipo: 'Lavoro', // o un altro default sensato
        ...tipoGiornataData,
        id: id,
        updatedAt: Timestamp.now(),
    };

    if (!docToSave.createdAt) {
        docToSave.createdAt = Timestamp.now();
    }

    try {
        // Scrittura parallela su Dexie e Firestore
        await Promise.all([
            dexieDB.tipiGiornata.put(docToSave),
            setDoc(doc(db, TIPI_GIORNATA_COLLECTION, id), docToSave, { merge: true })
        ]);
        console.log(`Tipo giornata ${id} salvato con successo.`);
        return id;
    } catch (error) {
        console.error("Errore durante il salvataggio del tipo giornata:", error);
        throw new Error("Salvataggio tipo giornata fallito");
    }
};

/**
 * Elimina una tipologia di giornata.
 * 
 * @param id L'ID del tipo giornata da eliminare.
 */
export const deleteTipoGiornata = async (id: string): Promise<void> => {
    if (!id) {
        console.error("ID non valido per l'eliminazione.");
        throw new Error("ID non valido");
    }

    try {
        // Eliminazione parallela da Dexie e Firestore
        await Promise.all([
            dexieDB.tipiGiornata.delete(id),
            deleteDoc(doc(db, TIPI_GIORNATA_COLLECTION, id))
        ]);
        console.log(`Tipo giornata ${id} eliminato con successo.`);
    } catch (error) {
        console.error("Errore durante l'eliminazione del tipo giornata:", error);
        throw new Error("Eliminazione tipo giornata fallita");
    }
};
