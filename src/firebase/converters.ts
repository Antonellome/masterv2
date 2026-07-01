
import {
    DocumentData,
    QueryDocumentSnapshot,
    FirestoreDataConverter,
    WithFieldValue,
    Timestamp,
} from 'firebase/firestore';
import {
    Tecnico,
    Cliente,
    Ditta,
    Nave,
    Luogo,
    Categoria,
    TipoGiornata,
    Veicolo
} from '@/models/definitions';

// Generic converter factory - REMAINS UNCHANGED AND SAFE
const createConverter = <T extends { id: string }>(): FirestoreDataConverter<T> => ({
    toFirestore: (data: WithFieldValue<T>): DocumentData => {
        const { id, ...rest } = data;
        return rest;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot): T => {
        return { ...snapshot.data(), id: snapshot.id } as T;
    }
});

// Specific and robust converter ONLY for Tecnico to handle malformed data
export const tecnicoConverter: FirestoreDataConverter<Tecnico> = {
    toFirestore: (tecnico: WithFieldValue<Tecnico>): DocumentData => {
        const { id, ...data } = tecnico;
        return data;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData>): Tecnico => {
        const data = snapshot.data() || {}; // Ensure data is an object

        // Safely provide default values for every field of the Tecnico interface
        return {
            id: snapshot.id,
            nome: data.nome || '',
            cognome: data.cognome || '',
            attivo: typeof data.attivo === 'boolean' ? data.attivo : true, // Default to active
            dittaId: data.dittaId || null,
            categoriaId: data.categoriaId || null,
            userId: data.userId || null,
            email: data.email || '',
            telefono: data.telefono || null,
            appAccess: typeof data.appAccess === 'boolean' ? data.appAccess : false,
            scadenzaContratto: data.scadenzaContratto instanceof Timestamp ? data.scadenzaContratto : null,
            scadenzaVisita: data.scadenzaVisita instanceof Timestamp ? data.scadenzaVisita : null,
            scadenzaPatente: data.scadenzaPatente instanceof Timestamp ? data.scadenzaPatente : null,
            scadenzaCartaIdentita: data.scadenzaCartaIdentita instanceof Timestamp ? data.scadenzaCartaIdentita : null,
            scadenzaPassaporto: data.scadenzaPassaporto instanceof Timestamp ? data.scadenzaPassaporto : null,
        };
    }
};

// All other converters use the safe, generic factory
export const clienteConverter = createConverter<Cliente>();
export const dittaConverter = createConverter<Ditta>();
export const naveConverter = createConverter<Nave>();
export const luogoConverter = createConverter<Luogo>();
export const categoriaConverter = createConverter<Categoria>();
export const tipoGiornataConverter = createConverter<TipoGiornata>();
export const veicoloConverter = createConverter<Veicolo>();
