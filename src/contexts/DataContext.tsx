
import React, { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    useCallback, 
    useMemo,
    ReactNode
} from 'react';
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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

// Definiamo un tipo per i nomi delle collezioni, basato sulle chiavi di AllData
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
    // Funzioni CRUD che operano direttamente su Firestore
    addDocument: <T extends object>(collectionName: CollectionName, data: T) => Promise<string>;
    updateDocument: <T extends object>(collectionName: CollectionName, id: string, data: T) => Promise<void>;
    deleteDocument: (collectionName: CollectionName, id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const db = getFirestore();

const COLLECTION_NAMES: CollectionName[] = ['tecnici', 'clienti', 'ditte', 'navi', 'luoghi', 'categorie', 'tipi-giornata', 'veicoli'];

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user, userRole } = useAuth();
    const [data, setData] = useState<AllData>({ 
        tecnici: [], clienti: [], ditte: [], navi: [], luoghi: [], 
        categorie: [], 'tipi-giornata': [], veicoli: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshData = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // --- LOGICA DI LETTURA DATI --- 
    useEffect(() => {
        if (!user || userRole !== 'Amministratore') {
            setLoading(false);
            setData({ tecnici: [], clienti: [], ditte: [], navi: [], luoghi: [], categorie: [], 'tipi-giornata': [], veicoli: [] });
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const allData: Partial<AllData> = {};
                // Eseguiamo tutte le query in parallelo
                const promises = COLLECTION_NAMES.map(name => getDocs(collection(db, name)));
                const results = await Promise.all(promises);

                results.forEach((snapshot, index) => {
                    const collectionName = COLLECTION_NAMES[index];
                    allData[collectionName] = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any;
                });

                setData(allData as AllData);
            } catch (err: any) {
                console.error("DataContext: Errore nel recupero dei dati anagrafici", err);
                setError(err.message || 'Si è verificato un errore nel caricamento dei dati.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, userRole, refreshTrigger]);

    // --- FUNZIONI DI SCRITTURA CRUD --- 

    const addDocument = useCallback(async <T extends object>(collectionName: CollectionName, data: T): Promise<string> => {
        try {
            const docRef = await addDoc(collection(db, collectionName), data);
            refreshData();
            return docRef.id;
        } catch (e) {
            console.error(`Errore aggiungendo documento a ${collectionName}:`, e);
            throw e; // Rilanciamo l'errore per gestirlo nel componente
        }
    }, [refreshData]);

    const updateDocument = useCallback(async <T extends object>(collectionName: CollectionName, id: string, data: T) => {
        try {
            await updateDoc(doc(db, collectionName, id), data);
            refreshData();
        } catch (e) {
            console.error(`Errore aggiornando documento in ${collectionName}:`, e);
            throw e;
        }
    }, [refreshData]);

    const deleteDocument = useCallback(async (collectionName: CollectionName, id: string) => {
        try {
            await deleteDoc(doc(db, collectionName, id));
            refreshData();
        } catch (e) {
            console.error(`Errore eliminando documento da ${collectionName}:`, e);
            throw e;
        }
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
