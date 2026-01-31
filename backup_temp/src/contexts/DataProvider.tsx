import React, { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { ScadenzeProvider } from './ScadenzeProvider';
import type { IDataContext, CollectionName, Tecnico } from '@/models/definitions';
import { CircularProgress, Box } from '@mui/material';

// Ripristiniamo la struttura originale e completa del contesto
const initialState: Omit<IDataContext, 'loading' | 'error' | 'addData' | 'updateData' | 'deleteData' | 'refreshData'> = {
    tecnici: [], veicoli: [], navi: [], luoghi: [], ditte: [], categorie: [], tipiGiornata: [], rapportini: [], clienti: [], documenti: [], qualifiche: [],
    tecniciMap: new Map(), veicoliMap: new Map(), naviMap: new Map(), luoghiMap: new Map(), ditteMap: new Map(), categorieMap: new Map(), tipiGiornataMap: new Map(), qualificheMap: new Map(),
};

export const DataContext = createContext<IDataContext>({ ...initialState, loading: true, error: null, addData: async () => {}, updateData: async () => {}, deleteData: async () => {}, refreshData: () => {} });

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [data, setData] = useState(initialState);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const collectionsToFetch: CollectionName[] = [
        'tecnici', 'veicoli', 'navi', 'luoghi', 'ditte',
        'categorie', 'tipiGiornata', 'clienti', 'documenti', 'qualifiche'
    ];

    // Usiamo useCallback per la funzione di refresh per stabilità
    const refreshData = useCallback(() => {
        // Questa funzione ora serve solo come placeholder o per refresh manuali se necessario
        // La logica principale è gestita dall'useEffect qui sotto
    }, []);

    useEffect(() => {
        // Non fare nulla finché lo stato dell'utente non è definito
        if (user === undefined) {
            setLoading(true);
            return;
        }

        // Se l'utente non è loggato, resetta tutto
        if (!user) {
            setData(initialState);
            setLoading(false);
            return;
        }

        setLoading(true);
        console.log("[DataProvider] Utente autenticato. Inizializzazione listeners...");

        const unsubscribes = collectionsToFetch.map(name => {
            const q = collection(db, name);
            return onSnapshot(q, querySnapshot => {
                console.log(`[DataProvider] Ricevuti dati per: ${name}. Documenti: ${querySnapshot.size}`);
                const items = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setData(prev => ({
                    ...prev,
                    [name]: items as any,
                    [`${name}Map`]: new Map(items.map(item => [item.id, item])) as any,
                }));
                setLoading(false); // Rimuovi il caricamento solo dopo che i dati sono pronti
            }, err => {
                console.error(`[DataProvider] Errore in snapshot per ${name}:`, err);
                setError(`Errore nel caricamento di ${name}.`);
                setLoading(false);
            });
        });

        // Listener per i rapportini specifici dell'utente
        const rapportiniQuery = query(collection(db, 'rapportini'), where("userId", "==", user.uid));
        const unsubRapportini = onSnapshot(rapportiniQuery, snapshot => {
             console.log(`[DataProvider] Ricevuti dati per: rapportini. Documenti: ${snapshot.size}`);
            const rapportiniItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setData(prev => ({ ...prev, rapportini: rapportiniItems as any }));
        }, err => {
            console.error(`[DataProvider] Errore in snapshot per rapportini:`, err);
            setError("Errore nel caricamento dei rapportini.");
        });

        unsubscribes.push(unsubRapportini);

        // Funzione di pulizia per rimuovere i listeners quando il componente si smonta o l'utente cambia
        return () => {
            console.log("[DataProvider] Rimozione listeners...");
            unsubscribes.forEach(unsub => unsub());
        };

    }, [user]); // L'effetto si attiva solo quando l'oggetto user cambia

    const addData = useCallback(async (collectionName: CollectionName, newData: DocumentData) => {
        if (!user) throw new Error("Utente non autenticato.");
        await addDoc(collection(db, collectionName), { ...newData, createdAt: serverTimestamp(), lastModified: serverTimestamp(), userId: user.uid });
    }, [user]);

    const updateData = useCallback(async (collectionName: CollectionName, id: string, updatedData: DocumentData) => {
        await updateDoc(doc(db, collectionName, id), { ...updatedData, lastModified: serverTimestamp() });
    }, []);

    const deleteData = useCallback(async (collectionName: CollectionName, id: string) => {
        await deleteDoc(doc(db, collectionName, id));
    }, []);

    const value: IDataContext = useMemo(() => ({
        ...data,
        loading,
        error,
        addData,
        updateData,
        deleteData,
        refreshData,
    }), [data, loading, error, addData, updateData, deleteData, refreshData]);

    // Mostra il caricamento solo la prima volta
    if (loading && data.tecnici.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <DataContext.Provider value={value}>
            <ScadenzeProvider>
                {children}
            </ScadenzeProvider>
        </DataContext.Provider>
    );
};