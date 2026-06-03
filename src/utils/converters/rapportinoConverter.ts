
import {
    DocumentData,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SnapshotOptions,
    WithFieldValue
} from 'firebase/firestore';
import { RapportinoSchema, createRapportinoSchema } from '@/models/rapportino.schema';

export const rapportinoConverter: FirestoreDataConverter<RapportinoSchema> = {
    /**
     * Converte un oggetto RapportinoSchema in un oggetto salvabile su Firestore.
     */
    toFirestore(rapportino: WithFieldValue<RapportinoSchema>): DocumentData {
        // Rimuoviamo l'ID, poiché è l'identificativo del documento e non va salvato nei campi.
        const { id, ...data } = rapportino;
        return data;
    },

    /**
     * Converte un documento Firestore in un oggetto RapportinoSchema.
     */
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RapportinoSchema {
        const data = snapshot.data(options);

        // Determiniamo se la giornata era lavorativa in base alla struttura dei dati salvati.
        // Se attivitaSvolte non è null, era una giornata lavorativa.
        const isLavorativo = data.attivitaSvolte != null;

        // Usiamo la nostra factory per ottenere lo schema di validazione corretto.
        const schema = createRapportinoSchema(isLavorativo);

        try {
            // Aggiungiamo l'ID del documento ai dati e validiamo.
            return schema.parse({ ...data, id: snapshot.id });
        } catch (error) {
            console.error("Errore di validazione Zod in fromFirestore:", error);
            // In caso di errore di validazione, lanciamo un errore per evitare di propagare dati corrotti.
            throw new Error(`Dati del rapportino con ID ${snapshot.id} non validi.`);
        }
    }
};
