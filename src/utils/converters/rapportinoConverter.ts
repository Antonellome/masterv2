
import {
    DocumentData,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SnapshotOptions,
    WithFieldValue
} from 'firebase/firestore';
import { rapportinoSchema, RapportinoSchema } from '@/models/rapportino.schema';

export const rapportinoConverter: FirestoreDataConverter<RapportinoSchema> = {
    /**
     * Converte un oggetto RapportinoSchema in un oggetto salvabile su Firestore.
     * Questa funzione ora valida attivamente i dati contro lo schema prima di inviarli,
     * garantendo che solo i dati conformi vengano salvati.
     */
    toFirestore(rapportino: WithFieldValue<RapportinoSchema>): DocumentData {
        // Rimuoviamo l'ID dall'oggetto prima della validazione e del salvataggio.
        const { id, ...data } = rapportino;
        
        try {
            // Valida l'oggetto 'data' con lo schema Zod.
            // Questo rimuove qualsiasi campo extra e assicura la conformità alla specifica.
            const validatedData = rapportinoSchema.omit({ id: true }).parse(data);
            return validatedData;
        } catch (error) {
            console.error("Errore di validazione Zod in toFirestore:", error);
            // Se la validazione fallisce, lancia un errore per impedire il salvataggio di dati corrotti.
            throw new Error("Dati del rapportino non validi. Impossibile salvare.");
        }
    },

    /**
     * Converte un documento Firestore in un oggetto RapportinoSchema.
     */
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RapportinoSchema {
        const data = snapshot.data(options);

        try {
            // Aggiungiamo l'ID del documento ai dati e validiamo con lo schema.
            // Questo assicura che l'app riceva sempre dati conformi.
            return rapportinoSchema.parse({ ...data, id: snapshot.id });
        } catch (error) {
            console.error("Errore di validazione Zod in fromFirestore:", error);
            // In caso di errore di validazione, lanciamo un errore per evitare di propagare dati corrotti.
            throw new Error(`Dati del rapportino con ID ${snapshot.id} non validi.`);
        }
    }
};
