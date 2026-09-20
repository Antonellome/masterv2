
import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Tecnico, Cliente, Nave, Luogo, TipoGiornata, Ditta, Categoria, Veicolo } from '@/models/definitions';

// Definiamo la struttura del nostro contesto
interface AnagraficheContextType {
    tecnici: Tecnico[];
    clienti: Cliente[];
    navi: Nave[];
    luoghi: Luogo[];
    tipiGiornata: TipoGiornata[];
    ditte: Ditta[];
    categorie: Categoria[];
    veicoli: Veicolo[];
    tecniciMap: Map<string, Tecnico>;
    clientiMap: Map<string, Cliente>;
    naviMap: Map<string, Nave>;
    luoghiMap: Map<string, Luogo>;
    tipiGiornataMap: Map<string, TipoGiornata>;
    ditteMap: Map<string, Ditta>;
    categorieMap: Map<string, Categoria>;
    veicoliMap: Map<string, Veicolo>;
    isLoading: boolean;
    error?: any;
    updateTecnico: (id: string, changes: Partial<Tecnico>) => Promise<void>; // NUOVA FUNZIONE
}

// Creiamo il contesto con un valore di default
const AnagraficheContext = createContext<AnagraficheContextType | undefined>(undefined);

// Il Provider che si occuperà del caricamento da Dexie, rispettando il Modello Ibrido.
export const AnagraficheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Leggiamo i dati in tempo reale da Dexie utilizzando useLiveQuery.
    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const clienti = useLiveQuery(() => db.clienti.toArray(), []);
    const navi = useLiveQuery(() => db.navi.toArray(), []);
    const luoghi = useLiveQuery(() => db.luoghi.toArray(), []);
    const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);
    const ditte = useLiveQuery(() => db.ditte.toArray(), []);
    const categorie = useLiveQuery(() => db.categorie.toArray(), []);
    const veicoli = useLiveQuery(() => db.veicoli.toArray(), []);

    // NUOVA FUNZIONE PER AGGIORNARE UN TECNICO
    const updateTecnico = useCallback(async (id: string, changes: Partial<Tecnico>) => {
        try {
            await db.tecnici.update(id, changes);
        } catch (error) {
            console.error("Errore durante l'aggiornamento del tecnico in Dexie:", error);
            throw error;
        }
    }, []);

    const value = useMemo<AnagraficheContextType>(() => {
        const isLoading = [
            tecnici, clienti, navi, luoghi, tipiGiornata, ditte, categorie, veicoli
        ].some(data => data === undefined);

        if (isLoading) {
            return {
                tecnici: [], clienti: [], navi: [], luoghi: [], tipiGiornata: [], ditte: [], categorie: [], veicoli: [],
                tecniciMap: new Map(), clientiMap: new Map(), naviMap: new Map(), luoghiMap: new Map(),
                tipiGiornataMap: new Map(), ditteMap: new Map(), categorieMap: new Map(), veicoliMap: new Map(),
                isLoading: true,
                updateTecnico, // Includiamo anche nel loading state per evitare errori
            };
        }

        const data = {
            tecnici: tecnici!, clienti: clienti!, navi: navi!, luoghi: luoghi!,
            tipiGiornata: tipiGiornata!, ditte: ditte!, categorie: categorie!, veicoli: veicoli!,
        };

        return {
            ...data,
            tecniciMap: new Map(data.tecnici.map(item => [item.id, item])),
            clientiMap: new Map(data.clienti.map(item => [item.id, item])),
            naviMap: new Map(data.navi.map(item => [item.id, item])),
            luoghiMap: new Map(data.luoghi.map(item => [item.id, item])),
            tipiGiornataMap: new Map(data.tipiGiornata.map(item => [item.id, item])),
            ditteMap: new Map(data.ditte.map(item => [item.id, item])),
            categorieMap: new Map(data.categorie.map(item => [item.id, item])),
            veicoliMap: new Map(data.veicoli.map(item => [item.id, item])),
            isLoading: false,
            updateTecnico, // Aggiungiamo la funzione al context
        };
    }, [tecnici, clienti, navi, luoghi, tipiGiornata, ditte, categorie, veicoli, updateTecnico]);

    return (
        <AnagraficheContext.Provider value={value}>
            {children}
        </AnagraficheContext.Provider>
    );
};

// Hook custom per usare facilmente il contesto.
export const useAnagrafiche = () => {
    const context = useContext(AnagraficheContext);
    if (context === undefined) {
        throw new Error('useAnagrafiche deve essere usato all\'interno di un AnagraficheProvider');
    }
    return context;
};
