import {
    ReactNode, useEffect, useMemo, useCallback, useReducer
} from 'react';
import {
    collection, onSnapshot, Unsubscribe, Timestamp, doc, addDoc, updateDoc, deleteDoc, WithFieldValue, DocumentData
} from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Tecnico, Veicolo, Nave, Luogo, Ditta, Categoria, TipoGiornata, Rapportino, Cliente, Documento, WebAppUser, CollectionName, BaseEntity
} from '@/models/definitions';
import { useAuth } from './AuthProvider';
import { DataContext } from './DataContext.types';
import type { IDataContext } from './DataContext.types';

// --- Helper Functions ---

const SORTABLE_COLLECTIONS: Set<CollectionName> = new Set([
    'clienti', 'navi', 'luoghi', 'ditte', 'categorie', 'tipiGiornata', 'tecnici', 'users'
]);

const sortData = <T extends { nome?: string }>(data: T[], collectionName: CollectionName): T[] => {
    if (SORTABLE_COLLECTIONS.has(collectionName)) {
        return [...data].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    }
    return data;
};

const createMap = <T extends BaseEntity>(data: T[]): { [key: string]: T } => {
    return data.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as { [key: string]: T });
};

const parseDates = <T,>(data: T): T => {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map(parseDates) as T;
    }

    if (data instanceof Timestamp) {
        return data.toDate() as T;
    }
    
    const newObj = { ...data } as { [key: string]: unknown };
    for (const key in newObj) {
        if (Object.prototype.hasOwnProperty.call(newObj, key)) {
            newObj[key] = parseDates(newObj[key]);
        }
    }
    return newObj as T;
};

// --- Reducer Logic ---

const ALL_COLLECTIONS: CollectionName[] = [
    'tecnici', 'veicoli', 'navi', 'luoghi', 'ditte', 'categorie',
    'tipiGiornata', 'rapportini', 'clienti', 'documenti', 'users'
];

// Lo stato dei dati della nostra App
interface DataState {
    loading: boolean;
    error: string | null;
    tecnici: Tecnico[];
    veicoli: Veicolo[];
    navi: Nave[];
    luoghi: Luogo[];
    ditte: Ditta[];
    categorie: Categoria[];
    tipiGiornata: TipoGiornata[];
    rapportini: Rapportino[];
    clienti: Cliente[];
    documenti: Documento[];
    webAppUsers: WebAppUser[]; // La proprietà per gli utenti web
}

const initialState: DataState = {
    loading: true, error: null,
    tecnici: [], veicoli: [], navi: [], luoghi: [], ditte: [], categorie: [],
    tipiGiornata: [], rapportini: [], clienti: [], documenti: [], webAppUsers: []
};

// Tipo per l'azione SET_DATA, più flessibile e sicuro
type DataStateUpdate = { [K in keyof Omit<DataState, 'loading' | 'error'>]?: DataState[K] };

type Action =
    | { type: 'START_LOADING' }
    | { type: 'STOP_LOADING' }
    | { type: 'SET_ERROR', payload: string | null }
    | { type: 'SET_DATA', payload: DataStateUpdate } // Usiamo il nuovo tipo
    | { type: 'RESET_STATE' };

const dataReducer = (state: DataState, action: Action): DataState => {
    switch (action.type) {
        case 'START_LOADING': return { ...state, loading: true };
        case 'STOP_LOADING': return { ...state, loading: false };
        case 'SET_ERROR': return { ...state, error: action.payload };
        case 'SET_DATA': return { ...state, ...action.payload };
        case 'RESET_STATE': return { ...initialState, loading: false };
        default: return state;
    }
};

// --- Data Provider Component ---

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const [state, dispatch] = useReducer(dataReducer, initialState);

    useEffect(() => {
        if (authLoading) {
            dispatch({ type: 'START_LOADING' });
            return;
        }

        if (!user) {
            dispatch({ type: 'RESET_STATE' });
            return;
        }

        dispatch({ type: 'START_LOADING' });
        const initialLoads = new Set<CollectionName>();

        const unsubscribes: Unsubscribe[] = ALL_COLLECTIONS.map(collectionName => {
            const collRef = collection(db, collectionName);
            return onSnapshot(collRef, (snapshot) => {
                const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const processedData = parseDates(rawData);
                const sortedData = sortData(processedData, collectionName);

                // FIX: Logica pulita per creare il payload senza usare `any`
                let payload: DataStateUpdate = {};
                if (collectionName === 'users') {
                    payload.webAppUsers = sortedData as WebAppUser[];
                } else {
                    payload[collectionName as Exclude<CollectionName, 'users'>] = sortedData;
                }

                dispatch({ type: 'SET_DATA', payload });

                if (!initialLoads.has(collectionName)) {
                    initialLoads.add(collectionName);
                    if (initialLoads.size === ALL_COLLECTIONS.length) {
                        dispatch({ type: 'STOP_LOADING' });
                    }
                }
            }, (err) => {
                console.error(`Errore caricamento ${collectionName}:`, err);
                dispatch({ type: 'SET_ERROR', payload: `Errore caricamento ${collectionName}.` });
                dispatch({ type: 'STOP_LOADING' });
            });
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, authLoading]);

    const addData = useCallback(async <T,>(collectionName: CollectionName, data: WithFieldValue<T>) => {
        await addDoc(collection(db, collectionName), data);
    }, []);

    const updateData = useCallback(async <T,>(collectionName: CollectionName, id: string, data: WithFieldValue<T>) => {
        await updateDoc(doc(db, collectionName, id), data as DocumentData);
    }, []);

    const deleteData = useCallback(async (collectionName: CollectionName, id: string) => {
        await deleteDoc(doc(db, collectionName, id));
    }, []);

    const { tecnici, veicoli, navi, luoghi, ditte, categorie, tipiGiornata, webAppUsers } = state;
    const tecniciMap = useMemo(() => createMap(tecnici), [tecnici]);
    const veicoliMap = useMemo(() => createMap(veicoli), [veicoli]);
    const naviMap = useMemo(() => createMap(navi), [navi]);
    const luoghiMap = useMemo(() => createMap(luoghi), [luoghi]);
    const ditteMap = useMemo(() => createMap(ditte), [ditte]);
    const categorieMap = useMemo(() => createMap(categorie), [categorie]);
    const tipiGiornataMap = useMemo(() => createMap(tipiGiornata), [tipiGiornata]);
    const webAppUsersMap = useMemo(() => createMap(webAppUsers), [webAppUsers]);

    const value = useMemo<IDataContext>(() => ({
        ...state,
        tecniciMap, veicoliMap, naviMap, luoghiMap, ditteMap, categorieMap, tipiGiornataMap, webAppUsersMap,
        addData, updateData, deleteData
    }), [state, tecniciMap, veicoliMap, naviMap, luoghiMap, ditteMap, categorieMap, tipiGiornataMap, webAppUsersMap, addData, updateData, deleteData]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};