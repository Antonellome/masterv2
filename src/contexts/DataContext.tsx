import {
    ReactNode, useEffect, useMemo, useCallback, useReducer, useContext
} from 'react';
import {
    collection, onSnapshot, Unsubscribe, Timestamp, doc, addDoc, updateDoc, deleteDoc, WithFieldValue, DocumentData
} from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Tecnico, Veicolo, Nave, Luogo, Ditta, Categoria, TipoGiornata, Rapportino, Cliente, Documento, WebAppUser, CollectionName, BaseEntity, Qualifica
} from '@/models/definitions';
import { useAuth } from './AuthProvider';
import { DataContext } from './DataContext.types';
import type { IDataContext } from './DataContext.types';

// --- Helper Functions ---

const SORTABLE_COLLECTIONS: Set<CollectionName> = new Set([
    'clienti', 'navi', 'luoghi', 'ditte', 'categorie', 'tipiGiornata', 'tecnici', 'utenti_master', 'qualifiche'
]);

const sortData = <T extends { nome?: string }>(data: T[], collectionName: CollectionName): T[] => {
    if (SORTABLE_COLLECTIONS.has(collectionName)) {
        return [...data].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    }
    return data;
};

const createMap = <T extends BaseEntity>(data: T[]): Map<string, T> => {
    return new Map(data.map(item => [item.id, item]));
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
    'tipiGiornata', 'rapportini', 'clienti', 'documenti', 'utenti_master', 'qualifiche'
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
    qualifiche: Qualifica[];
    webAppUsers: WebAppUser[];
}

const initialState: DataState = {
    loading: true, error: null,
    tecnici: [], veicoli: [], navi: [], luoghi: [], ditte: [], categorie: [],
    tipiGiornata: [], rapportini: [], clienti: [], documenti: [], webAppUsers: [], qualifiche: []
};

// Tipo per l'azione SET_DATA, più flessibile e sicuro
type DataStateUpdate = { [K in keyof Omit<DataState, 'loading' | 'error'>]?: DataState[K] };

type Action =
    | { type: 'START_LOADING' }
    | { type: 'STOP_LOADING' }
    | { type: 'SET_ERROR', payload: string | null }
    | { type: 'SET_DATA', payload: DataStateUpdate }
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

                let payload: DataStateUpdate = {};
                if (collectionName === 'utenti_master') {
                    payload.webAppUsers = sortedData as WebAppUser[];
                } else {
                    payload[collectionName as Exclude<CollectionName, 'utenti_master'>] = sortedData;
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
    
    // --- Funzioni di manipolazione dati ---
    const addData = useCallback(async (collectionName: CollectionName, data: DocumentData) => {
        await addDoc(collection(db, collectionName), data);
    }, []);

    const updateData = useCallback(async (collectionName: CollectionName, id: string, data: DocumentData) => {
        await updateDoc(doc(db, collectionName, id), data);
    }, []);

    const deleteData = useCallback(async (collectionName: CollectionName, id: string) => {
        await deleteDoc(doc(db, collectionName, id));
    }, []);

    const refreshData = useCallback(() => {
      // Funzione vuota, la logica è nell'useEffect
    }, []);

    // --- Creazione delle Mappe ---
    const { tecnici, veicoli, navi, luoghi, ditte, categorie, tipiGiornata, webAppUsers, qualifiche } = state;
    const tecniciMap = useMemo(() => createMap(tecnici), [tecnici]);
    const veicoliMap = useMemo(() => createMap(veicoli), [veicoli]);
    const naviMap = useMemo(() => createMap(navi), [navi]);
    const luoghiMap = useMemo(() => createMap(luoghi), [luoghi]);
    const ditteMap = useMemo(() => createMap(ditte), [ditte]);
    const categorieMap = useMemo(() => createMap(categorie), [categorie]);
    const tipiGiornataMap = useMemo(() => createMap(tipiGiornata), [tipiGiornata]);
    const qualificheMap = useMemo(() => createMap(qualifiche), [qualifiche]);
    const webAppUsersMap = useMemo(() => createMap(webAppUsers || []), [webAppUsers]);

    // --- Valore del Contesto ---
    const value = useMemo<IDataContext>(() => ({
        ...state,
        tecniciMap, veicoliMap, naviMap, luoghiMap, ditteMap, categorieMap, tipiGiornataMap, qualificheMap, webAppUsersMap,
        addData, updateData, deleteData, refreshData,
    }), [state, tecniciMap, veicoliMap, naviMap, luoghiMap, ditteMap, categorieMap, tipiGiornataMap, qualificheMap, webAppUsersMap, addData, updateData, deleteData, refreshData]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// --- HOOK PERSONALIZZATO ---
export const useDataContext = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useDataContext deve essere utilizzato all'interno di un DataProvider");
    }
    return context;
};
