
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Tecnico, Cliente, Nave, Luogo, TipoGiornata } from '@/models/definitions';
import { Box, CircularProgress, Typography } from '@mui/material';

// Definiamo la struttura del nostro contesto
interface AnagraficheContextType {
    tecnici: Tecnico[];
    clienti: Cliente[];
    navi: Nave[];
    luoghi: Luogo[];
    tipiGiornata: TipoGiornata[];
    tecniciMap: Map<string, Tecnico>;
    clientiMap: Map<string, Cliente>;
    naviMap: Map<string, Nave>;
    luoghiMap: Map<string, Luogo>;
    tipiGiornataMap: Map<string, TipoGiornata>;
    loading: boolean;
}

// Creiamo il contesto con un valore di default
const AnagraficheContext = createContext<AnagraficheContextType | undefined>(undefined);

// Helper function per caricare una collection
async function fetchCollection<T>(collectionName: string): Promise<T[]> {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

// Il Provider che si occuperà del caricamento
export const AnagraficheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [anagrafiche, setAnagrafiche] = useState<{
        tecnici: Tecnico[];
        clienti: Cliente[];
        navi: Nave[];
        luoghi: Luogo[];
        tipiGiornata: TipoGiornata[];
    }>({
        tecnici: [],
        clienti: [],
        navi: [],
        luoghi: [],
        tipiGiornata: [],
    });

    useEffect(() => {
        const loadAllAnagrafiche = async () => {
            try {
                // Carica tutte le anagrafiche in parallelo
                const [tecnici, clienti, navi, luoghi, tipiGiornata] = await Promise.all([
                    fetchCollection<Tecnico>('tecnici'),
                    fetchCollection<Cliente>('clienti'),
                    fetchCollection<Nave>('navi'),
                    fetchCollection<Luogo>('luoghi'),
                    fetchCollection<TipoGiornata>('tipiGiornata'),
                ]);
                setAnagrafiche({ tecnici, clienti, navi, luoghi, tipiGiornata });
            } catch (error) {
                console.error("Errore critico durante il caricamento delle anagrafiche:", error);
                // Qui potremmo mostrare un messaggio di errore fatale
            } finally {
                setLoading(false);
            }
        };

        loadAllAnagrafiche();
    }, []);

    // Creiamo le mappe una sola volta e le memoizziamo
    const value = useMemo(() => ({
        ...anagrafiche,
        tecniciMap: new Map(anagrafiche.tecnici.map(item => [item.id, item])),
        clientiMap: new Map(anagrafiche.clienti.map(item => [item.id, item])),
        naviMap: new Map(anagrafiche.navi.map(item => [item.id, item])),
        luoghiMap: new Map(anagrafiche.luoghi.map(item => [item.id, item])),
        tipiGiornataMap: new Map(anagrafiche.tipiGiornata.map(item => [item.id, item])),
        loading,
    }), [anagrafiche, loading]);

    // Mentre carica, mostriamo un loader a schermo intero
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    width: '100vw',
                }}
            >
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Caricamento dati essenziali...</Typography>
            </Box>
        );
    }

    return (
        <AnagraficheContext.Provider value={value}>
            {children}
        </AnagraficheContext.Provider>
    );
};

// Hook custom per usare facilmente il contesto
export const useAnagrafiche = () => {
    const context = useContext(AnagraficheContext);
    if (context === undefined) {
        throw new Error('useAnagrafiche deve essere usato all\'interno di un AnagraficheProvider');
    }
    return context;
};
