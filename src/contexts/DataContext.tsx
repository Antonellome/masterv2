
import { ReactNode, useEffect, useMemo, useCallback, useReducer } from 'react';
import { collection, onSnapshot, type Unsubscribe, Timestamp, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type {
    Tecnico, Veicolo, Nave, Luogo, Ditta, Categoria, TipoGiornata, Rapportino, Cliente, Documento, WebAppUser, CollectionName, BaseEntity
} from '@/models/definitions';
import { useAuth } from './AuthContext';
import { DataContext } from './DataContext.types';
import type { IDataContext } from './DataContext.types';

// --- Helper Functions (invariate) ---
const SORTABLE_COLLECTIONS: Set<CollectionName> = new Set([
    'clienti', 'navi', 'luoghi', 'ditte', 'categorie', 'tipiGiornata', 'tecnici', 'users'
]);

const sortData = <T extends { nome?: string }>(data: T[], collectionName: CollectionName): T[] => {
    if (SORTABLE_COLLECTIONS.has(collectionName)) {
        return [...data].sort((a, b) => a.nome?.localeCompare(b.nome || '') || 0);
    }
    return data;
};

const createMap = <T extends BaseEntity>(data: T[]): { [key: string]: T } => {
    return data.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as { [key: string]: T });
};

const parseDates = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(parseDates);
  if (data.seconds !== undefined && data.nanoseconds !== undefined) {
    return new Timestamp(data.seconds, data.nanoseconds);
  }
  const newObj: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      newObj[key] = parseDates(data[key]);
    }
  }
  return newObj;
};

// --- Reducer Logic (invariato) ---
const ALL_COLLECTIONS: CollectionName[] = [
    'tecnici', 'veicoli', 'navi', 'luoghi', 'ditte', 'categorie', 
    'tipiGiornata', 'rapportini', 'clienti', 'documenti', 'users'
];

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
    webAppUsers: WebAppUser[];
}

const initialState: DataState = {
    loading: true, error: null,
    tecnici: [], veicoli: [], navi: [], luoghi: [], ditte: [], categorie: [],
    tipiGiornata: [], rapportini: [], clienti: [], documenti: [], webAppUsers: []
};

type Action =
  | { type: 'START_LOADING' }
  | { type: 'STOP_LOADING' }
  | { type: 'SET_ERROR', payload: string | null }
  | { type: 'SET_DATA', payload: Partial<DataState> }
  | { type: 'RESET_STATE' };

const dataReducer = (state: DataState, action: Action): DataState => {
    switch (action.type) {
        case 'START_LOADING':
            return { ...state, loading: true };
        case 'STOP_LOADING':
            return { ...state, loading: false };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_DATA':
            return { ...state, ...action.payload };
        case 'RESET_STATE':
            return { ...initialState, loading: false };
        default:
            return state;
    }
};

// --- Data Provider Component ---
export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { currentUser, loading: authLoading } = useAuth();
    const [state, dispatch] = useReducer(dataReducer, initialState);

    useEffect(() => {
        // Se l'autenticazione è ancora in corso, mostra lo stato di caricamento e attendi.
        if (authLoading) {
            dispatch({ type: 'START_LOADING' });
            return;
        }

        // Se l'autenticazione è terminata e non c'è nessun utente,
        // resetta lo stato a quello iniziale e assicurati che non ci siano listener attivi.
        if (!currentUser) {
            dispatch({ type: 'RESET_STATE' });
            return;
        }

        // Se l'utente è autenticato, inizia a caricare i dati.
        dispatch({ type: 'START_LOADING' });
        const initialLoads = new Set<CollectionName>();

        const unsubscribes: Unsubscribe[] = ALL_COLLECTIONS.map(collectionName => {
            const collRef = collection(db, collectionName);
            return onSnapshot(collRef, 
                (snapshot) => {
                    const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const processedData = parseDates(rawData);
                    const sortedData = sortData(processedData, collectionName);
                    
                    dispatch({ type: 'SET_DATA', payload: { [collectionName]: sortedData } });

                    // Logica di caricamento corretta
                    if (!initialLoads.has(collectionName)) {
                        initialLoads.add(collectionName);
                        if (initialLoads.size === ALL_COLLECTIONS.length) {
                            dispatch({ type: 'STOP_LOADING' });
                        }
                    }
                }, 
                (err) => {
                    console.error(`Errore durante il caricamento di ${collectionName}:`, err);
                    dispatch({ type: 'SET_ERROR', payload: `Impossibile caricare ${collectionName}. Permessi insufficienti.` });
                    dispatch({ type: 'STOP_LOADING' }); // Ferma il caricamento anche in caso di errore
                }
            );
        });

        // La funzione di pulizia viene eseguita quando l'utente si disconnette o il componente viene smontato.
        // Annulla tutte le sottoscrizioni per prevenire errori di permesso.
        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [currentUser, authLoading]);

    // Funzioni di modifica dati (invariate)
    const addData = useCallback(async (collectionName: CollectionName, data: any) => {
        await addDoc(collection(db, collectionName), data);
    }, []);

    const updateData = useCallback(async (collectionName: CollectionName, id: string, data: any) => {
        await updateDoc(doc(db, collectionName, id), data);
    }, []);

    const deleteData = useCallback(async (collectionName: CollectionName, id: string) => {
        await deleteDoc(doc(db, collectionName, id));
    }, []);

    // Memoizzazione (invariata)
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

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
