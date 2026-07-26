
import React, { 
    createContext, 
    useContext, 
    useMemo,
    ReactNode
} from 'react';
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
// CORREZIONE: Importiamo gli strumenti corretti per leggere dal DB locale
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';

// Funzione helper per creare le mappe, rimane invariata
const createMap = <T extends { id: string }>(items: T[] | undefined): { [id: string]: T } => {
    if (!items) return {};
    return items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as { [id: string]: T });
};

// Interfaccia del Context
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
    error: any; // Mantenuto per compatibilità, ma meno rilevante con useLiveQuery
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {

    // --- SOSTITUZIONE LOGICA DI FETCH ---
    // Usiamo useLiveQuery per leggere in tempo reale dal database locale Dexie.
    const tecnici = useLiveQuery(() => db.tecnici.toArray());
    const clienti = useLiveQuery(() => db.clienti.toArray());
    const ditte = useLiveQuery(() => db.ditte.toArray());
    const navi = useLiveQuery(() => db.navi.toArray());
    const luoghi = useLiveQuery(() => db.luoghi.toArray());
    const categorie = useLiveQuery(() => db.categorie.toArray());
    const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray());
    const veicoli = useLiveQuery(() => db.veicoli.toArray());

    // Con useLiveQuery, 'undefined' indica che la query iniziale è in corso.
    const loading = [tecnici, clienti, ditte, navi, luoghi, categorie, tipiGiornata, veicoli].some(data => data === undefined);
    // --- FINE SOSTITUZIONE ---

    // La creazione delle mappe non cambia, ora usa i dati reattivi di useLiveQuery
    const tecniciMap = useMemo(() => createMap(tecnici), [tecnici]);
    const clientiMap = useMemo(() => createMap(clienti), [clienti]);
    const naviMap = useMemo(() => createMap(navi), [navi]);
    const luoghiMap = useMemo(() => createMap(luoghi), [luoghi]);
    const tipiGiornataMap = useMemo(() => createMap(tipiGiornata), [tipiGiornata]);

    // Il valore fornito dal context
    const value = useMemo(() => ({
        tecnici: tecnici || [],
        clienti: clienti || [],
        ditte: ditte || [],
        navi: navi || [],
        luoghi: luoghi || [],
        categorie: categorie || [],
        tipiGiornata: tipiGiornata || [],
        veicoli: veicoli || [],
        tecniciMap,
        clientiMap,
        naviMap,
        luoghiMap,
        tipiGiornataMap,
        loading,
        error: null, // useLiveQuery non espone un errore in questo modo, quindi lo impostiamo a null.
    }), [
        tecnici, clienti, ditte, navi, luoghi, categorie, tipiGiornata, veicoli, 
        tecniciMap, clientiMap, naviMap, luoghiMap, tipiGiornataMap, 
        loading
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

// Hook per consumare il context, rinominato per chiarezza
export const useAnagraficaData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useAnagraficaData deve essere usato all\'interno di un DataProvider');
    }
    return context;
};
