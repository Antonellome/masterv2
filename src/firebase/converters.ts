
import {
    DocumentData,
    QueryDocumentSnapshot,
    FirestoreDataConverter,
    WithFieldValue,
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

// Generic converter factory
const createConverter = <T extends { id: string }>(): FirestoreDataConverter<T> => ({
    toFirestore: (data: WithFieldValue<T>): DocumentData => {
        const { id, ...rest } = data;
        return rest;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot): T => {
        return { ...snapshot.data(), id: snapshot.id } as T;
    }
});

// Export a converter for each model type
export const tecnicoConverter = createConverter<Tecnico>();
export const clienteConverter = createConverter<Cliente>();
export const dittaConverter = createConverter<Ditta>();
export const naveConverter = createConverter<Nave>();
export const luogoConverter = createConverter<Luogo>();
export const categoriaConverter = createConverter<Categoria>();
export const tipoGiornataConverter = createConverter<TipoGiornata>();
export const veicoloConverter = createConverter<Veicolo>();
