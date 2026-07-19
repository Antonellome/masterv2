
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
// AGGIORNAMENTO: Importiamo il nostro hook per i dati locali
import { useCollectionData } from '@/hooks/useCollectionData';

// Funzione helper per creare le mappe, rimane invariata
const createMap = <T extends { id: string }>(items: T[] | undefined): { [id: string]: T } => {
    if (!items) return {};
    return items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as { [id: string]: T });
};

// Le interfacce rimangono per lo più le stesse, ma rimuoviamo le funzioni di scrittura
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
    loading: boolean; // Un unico stato di caricamento aggregato
    error: any; // Gestirà gli errori aggregati
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {

    // --- SOSTITUZIONE LOGICA DI FETCH ---
    // Usiamo il nostro hook offline-first per ogni anagrafica
    const { data: tecnici, loading: loadingTecnici, error: errorTecnici } = useCollectionData<Tecnico>('tecnici');
    const { data: clienti, loading: loadingClienti, error: errorClienti } = useCollectionData<Cliente>('clienti');
    const { data: ditte, loading: loadingDitte, error: errorDitte } = useCollectionData<Ditta>('ditte');
    const { data: navi, loading: loadingNavi, error: errorNavi } = useCollectionData<Nave>('navi');
    const { data: luoghi, loading: loadingLuoghi, error: errorLuoghi } = useCollectionData<Luogo>('luoghi');
    const { data: categorie, loading: loadingCategorie, error: errorCategorie } = useCollectionData<Categoria>('categorie');
    const { data: tipiGiornata, loading: loadingTipiGiornata, error: errorTipiGiornata } = useCollectionData<TipoGiornata>('tipiGiornata');
    const { data: veicoli, loading: loadingVeicoli, error: errorVeicoli } = useCollectionData<Veicolo>('veicoli');

    // Aggreghiamo gli stati di loading e error
    const loading = loadingTecnici || loadingClienti || loadingDitte || loadingNavi || loadingLuoghi || loadingCategorie || loadingTipiGiornata || loadingVeicoli;
    const error = errorTecnici || errorClienti || errorDitte || errorNavi || errorLuoghi || errorCategorie || errorTipiGiornata || errorVeicoli;
    // --- FINE SOSTITUZIONE ---

    // La creazione delle mappe rimane identica, sfruttando i dati locali
    const tecniciMap = useMemo(() => createMap(tecnici), [tecnici]);
    const clientiMap = useMemo(() => createMap(clienti), [clienti]);
    const naviMap = useMemo(() => createMap(navi), [navi]);
    const luoghiMap = useMemo(() => createMap(luoghi), [luoghi]);
    const tipiGiornataMap = useMemo(() => createMap(tipiGiornata), [tipiGiornata]);

    // Il valore fornito dal context ora è più semplice e pulito
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
        error,
    }), [
        tecnici, clienti, ditte, navi, luoghi, categorie, tipiGiornata, veicoli, 
        tecniciMap, clientiMap, naviMap, luoghiMap, tipiGiornataMap, 
        loading, error
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

// L'hook per consumare il context viene rinominato per chiarezza
export const useAnagraficaData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useAnagraficaData deve essere usato all\'interno di un DataProvider');
    }
    return context;
};
