
import React, { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    useCallback, 
    useMemo,
    ReactNode
} from 'react';
import { getFirestore, collection, getDocs, doc, addDoc, writeBatch, query, updateDoc, deleteDoc } from 'firebase/firestore';
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
import { useAuth } from './AuthProvider';

export type CollectionName = keyof AllData;

interface AllData {
    tecnici: Tecnico[];
    clienti: Cliente[];
    ditte: Ditta[];
    navi: Nave[];
    luoghi: Luogo[];
    categorie: Categoria[];
    'tipi-giornata': TipoGiornata[];
    veicoli: Veicolo[];
}

interface DataContextType extends AllData {
    loading: boolean;
    error: string | null;
    refreshData: () => void;
    addDocument: <T extends object>(collectionName: CollectionName, data: T) => Promise<string>;
    updateDocument: <T extends object>(collectionName: CollectionName, id: string, data: T) => Promise<void>;
    deleteDocument: (collectionName: CollectionName, id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const db = getFirestore();

const COLLECTION_NAMES: CollectionName[] = ['tecnici', 'clienti', 'ditte', 'navi', 'luoghi', 'categorie', 'tipi-giornata', 'veicoli'];

const getRealCollectionName = (name: CollectionName): string => {
    if (name === 'tipi-giornata') return 'giornate';
    return name;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, userRole } = useAuth();
    const [data, setData] = useState<AllData>({ 
        tecnici: [], clienti: [], ditte: [], navi: [], luoghi: [], 
        categorie: [], 'tipi-giornata': [], veicoli: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshData = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

    useEffect(() => {
        if (!user || userRole !== 'Amministratore') {
            setLoading(false);
            setData({ tecnici: [], clienti: [], ditte: [], navi: [], luoghi: [], categorie: [], 'tipi-giornata': [], veicoli: [] });
            return;
        }

        const initializeAndFetchData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                 const allData: Partial<AllData> = {};
                const fetchPromises = COLLECTION_NAMES.map(async (name) => {
                    const realCollectionName = getRealCollectionName(name);
                    const snapshot = await getDocs(collection(db, realCollectionName));
                    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
                    return { key: name, data: list };
                });
                const results = await Promise.all(fetchPromises);
                results.forEach(result => { allData[result.key as CollectionName] = result.data; });
                setData(allData as AllData);

            } catch (err: any) {
                console.error("DataContext: Errore nel recupero dei dati anagrafici", err);
                setError(err.message || 'Si è verificato un errore nel caricamento dei dati.');
            } finally {
                setLoading(false);
            }
        };

        initializeAndFetchData();
    }, [user, userRole, refreshTrigger]);

    const addDocument = useCallback(async <T extends object>(collectionName: CollectionName, data: T): Promise<string> => {
        const realCollectionName = getRealCollectionName(collectionName);
        try {
            const docRef = await addDoc(collection(db, realCollectionName), data);
            refreshData();
            return docRef.id;
        } catch (e) { throw e; }
    }, [refreshData]);

    const updateDocument = useCallback(async <T extends object>(collectionName: CollectionName, id: string, data: T) => {
        const realCollectionName = getRealCollectionName(collectionName);
        try {
            await updateDoc(doc(db, realCollectionName, id), data);
            refreshData();
        } catch (e) { throw e; }
    }, [refreshData]);

    const deleteDocument = useCallback(async (collectionName: CollectionName, id: string) => {
        const realCollectionName = getRealCollectionName(collectionName);
        try {
            await deleteDoc(doc(db, realCollectionName, id));
            refreshData();
        } catch (e) { throw e; }
    }, [refreshData]);

    const value = useMemo(() => ({
        ...data,
        loading,
        error,
        refreshData,
        addDocument,
        updateDocument,
        deleteDocument,
    }), [data, loading, error, refreshData, addDocument, updateDocument, deleteDocument]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useDataContext = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext deve essere usato all\'interno di un DataProvider');
    }
    return context;
};
