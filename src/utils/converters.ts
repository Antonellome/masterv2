import { FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions, DocumentData } from 'firebase/firestore';
import { Tecnico, Veicolo, Documento } from '@/models/definitions';

const createConverter = <T extends { id: string, [key: string]: any }>(defaults: Omit<T, 'id'>): FirestoreDataConverter<T> => ({
    toFirestore(modelObject: T): DocumentData {
        // Rimuove i campi con valore undefined (Firestore non accetta undefined)
        const cleanedData: DocumentData = {};
        Object.keys(modelObject).forEach(key => {
            if (modelObject[key] !== undefined) {
                cleanedData[key] = modelObject[key];
            }
        });
        return cleanedData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
        const data = snapshot.data(options)!;
        const model = { id: snapshot.id } as T;

        for (const key in defaults) {
            if (key !== 'id') {
                (model as any)[key] = data[key] ?? (defaults as any)[key];
            }
        }

        return model;
    }
});

export const tecnicoConverter = createConverter<Tecnico>({
    nome: '',
    cognome: '',
    scadenzaVisita: null,
    scadenzaPatente: null,
    scadenzaCartaIdentita: null,
    scadenzaPassaporto: null,
    scadenzaCorsoSicurezza: null,
    scadenzaUnilav: null,
    scadenzaCQC: null,
    scadenzaContratto: null,
    scadenzaAntincendio: null,
    scadenzaPrimoSoccorso: null,
    scadenzeSilenced: {},
});

export const veicoloConverter = createConverter<Veicolo>({
    veicolo: '',
    targa: '',
    scadenzaAssicurazione: null,
    scadenzaBollo: null,
    scadenzaRevisione: null,
    scadenzaTagliando: null,
    scadenzaTachigrafo: null,
    scadenzeSilenced: {},
});

export const documentoConverter = createConverter<Documento>({
    nome: '',
    scadenza1: null,
    scadenza2: null,
    scadenzeSilenced: {},
});
