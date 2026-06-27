
import React, { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    useCallback, 
    useMemo,
    ReactNode
} from 'react';
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, FirestoreDataConverter } from 'firebase/firestore';
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
import {
    tecnicoConverter,
    clienteConverter,
    dittaConverter,
    naveConverter,
    luogoConverter,
    categoriaConverter,
    tipoGiornataConverter,
    veicoloConverter
} from '@/firebase/converters';
import { useAuth } from './AuthProvider';

const createMap = <T extends { id: string }>(items: T[] | undefined): { [id: string]: T } => {
    if (!items) return {};
    return items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as { [id: string]: T });
};

export type CollectionName = keyof AllData;

interface AllData {
    tecnici: Tecnico[];
    clienti: Cliente[];
    ditte: Ditta[];
    navi: Nave[];
    luoghi: Luogo[];
    categorie: Categoria[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
}

// Map collection names to their converters
const converters: { [K in CollectionName]: FirestoreDataConverter<AllData[K][number]> } = {
    tecnici: tecnicoConverter,
    clienti: clienteConverter,
    ditte: dittaConverter,
    navi: naveConverter,
    luoghi: luogoConverter,
    categorie: categoriaConverter,
    tipiGiornata: tipoGiornataConverter,
    veicoli: veicoloConverter,
};

interface DataContextType {
    tecnici: Tecnico[];
    clienti: Cliente[];
    ditte: Ditta[];
    navi: Nave[];
    luoghi: Luogo[];
    categorie: Categoria[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
    tecniciMap: { [id: string]: Tecnico };
    clientiMap: { [id: string]: Cliente };
    naviMap: { [id: string]: Nave };
    luoghiMap: { [id: string]: Luogo };
    tipiGiornataMap: { [id: string]: TipoGiornata };
    loading: boolean;
    error: string | null;
    refreshData: () => void;
    addDocument: <T extends { id: string }>(collectionName: CollectionName, data: T) => Promise<string>;
    updateDocument: <T extends object>(collectionName: CollectionName, id: string, data: Partial<T>) => Promise<void>;
    deleteDocument: (collectionName: CollectionName, id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const db = getFirestore();

const COLLECTION_NAMES: CollectionName[] = ['tecnici', 'clienti', 'ditte', 'navi', 'luoghi', 'categorie', 'tipiGiornata', 'veicoli'];

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, userRole } = useAuth();
    const [data, setData] = useState<AllData>({ 
        tecnici: [], clienti: [], ditte: [], navi: [], luoghi: [], 
        categorie: [], tipiGiornata: [], veicoli: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshData = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

    useEffect(() => {
        if (!user || userRole !== 'Amministratore') {
            setLoading(false);
            setData({ tecnici: [], clienti: [], ditte: [], navi: [], luoghi: [], categorie: [], tipiGiornata: [], veicoli: [] });
            return;
        }

        const initializeAndFetchData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const allData: Partial<AllData> = {};
                const fetchPromises = COLLECTION_NAMES.map(async (name) => {
                    const collectionRef = collection(db, name).withConverter(converters[name]);
                    const snapshot = await getDocs(collectionRef);
                    const list = snapshot.docs.map(d => d.data());
                    return { key: name, data: list };
                });

                const results = await Promise.all(fetchPromises);
                results.forEach(result => {
                    allData[result.key as CollectionName] = result.data as any; // The structure is correct here
                });
                setData(allData as AllData);

            } catch (err: unknown) {
                console.error("DataContext: Errore nel recupero dei dati anagrafici", err);
                const message = err instanceof Error ? err.message : 'Si è verificato un errore nel caricamento dei dati.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        initializeAndFetchData();
    }, [user, userRole, refreshTrigger]);

    const addDocument = useCallback(async <T extends { id: string }>(collectionName: CollectionName, data: T): Promise<string> => {
        const collectionRef = collection(db, collectionName).withConverter(converters[collectionName]);
        const docRef = await addDoc(collectionRef, data as any);
        refreshData();
        return docRef.id;
    }, [refreshData]);

    const updateDocument = useCallback(async <T extends object>(collectionName: CollectionName, id: string, data: Partial<T>) => {
        const docRef = doc(db, collectionName, id).withConverter(converters[collectionName]);
        await updateDoc(docRef, data as any);
        refreshData();
    }, [refreshData]);

    const deleteDocument = useCallback(async (collectionName: CollectionName, id: string) => {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
        refreshData();
    }, [refreshData]);

    const tecniciMap = useMemo(() => createMap(data.tecnici), [data.tecnici]);
    const clientiMap = useMemo(() => createMap(data.clienti), [data.clienti]);
    const naviMap = useMemo(() => createMap(data.navi), [data.navi]);
    const luoghiMap = useMemo(() => createMap(data.luoghi), [data.luoghi]);
    const tipiGiornataMap = useMemo(() => createMap(data.tipiGiornata), [data.tipiGiornata]);

    const value = useMemo(() => ({
        ...data,
        tecniciMap,
        clientiMap,
        naviMap,
        luoghiMap,
        tipiGiornataMap,
        loading,
        error,
        refreshData,
        addDocument,
        updateDocument,
        deleteDocument,
    }), [data, tecniciMap, clientiMap, naviMap, luoghiMap, tipiGiornataMap, loading, error, refreshData, addDocument, updateDocument, deleteDocument]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useDataContext = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext deve essere usato allinterno di un DataProvider');
    }
    return context;
};
