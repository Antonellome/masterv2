import { ReactNode, useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, type Unsubscribe, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type {
    Tecnico, Veicolo, Nave, Luogo, Ditta, Categoria, TipoGiornata, Rapportino, Cliente, Documento, WebAppUser, CollectionName
} from '@/models/definitions';
import { useAuth } from '@/hooks/useAuth';
import { DataContext } from './DataContext.types';
import type { IDataContext } from './DataContext.types';
import { BaseEntity } from '@/models/definitions';

const SORTABLE_COLLECTIONS: Set<CollectionName> = new Set([
    'clienti', 'navi', 'luoghi', 'ditte', 'categorie', 'tipiGiornata', 'tecnici', 'users'
]);

const sortData = <T extends { nome?: string }>(data: T[], collectionName: CollectionName): T[] => {
    if (SORTABLE_COLLECTIONS.has(collectionName)) {
        return [...data].sort((a, b) => a.nome?.localeCompare(b.nome || '') || 0);
    }
    return data;
};

interface DataProviderProps {
    children: ReactNode;
}

const ALL_COLLECTIONS: CollectionName[] = [
    'tecnici', 'veicoli', 'navi', 'luoghi', 'ditte', 'categorie', 
    'tipiGiornata', 'rapportini', 'clienti', 'documenti', 'users'
];

const createMap = <T extends BaseEntity>(data: T[]): Map<string, T> => {
    return new Map(data.map(item => [item.id, item]));
};

// Funzione per ricreare le date dai timestamp serializzati
const parseDates = (data: any) => {
  if (data && typeof data === 'object') {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        if (value && typeof value === 'object' && value.seconds !== undefined && value.nanoseconds !== undefined) {
          data[key] = new Timestamp(value.seconds, value.nanoseconds);
        } else {
          parseDates(value);
        }
      }
    }
  }
  return data;
};

export const DataProvider = ({ children }: DataProviderProps) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
    const [navi, setNavi] = useState<Nave[]>([]);
    const [luoghi, setLuoghi] = useState<Luogo[]>([]);
    const [ditte, setDitte] = useState<Ditta[]>([]);
    const [categorie, setCategorie] = useState<Categoria[]>([]);
    const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [documenti, setDocumenti] = useState<Documento[]>([]);
    const [webAppUsers, setWebAppUsers] = useState<WebAppUser[]>([]);

    const stateSetters = {
        tecnici: setTecnici,
        veicoli: setVeicoli,
        navi: setNavi,
        luoghi: setLuoghi,
        ditte: setDitte,
        categorie: setCategorie,
        tipiGiornata: setTipiGiornata,
        rapportini: setRapportini,
        clienti: setClienti,
        documenti: setDocumenti,
        users: setWebAppUsers,
    };

    useEffect(() => {
        if (!currentUser) {
            ALL_COLLECTIONS.forEach(collectionName => {
                const setter = stateSetters[collectionName as keyof typeof stateSetters];
                if (setter) {
                    // @ts-expect-error This is a safe override
                    setter([]);
                }
            });
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribes: Unsubscribe[] = [];

        ALL_COLLECTIONS.forEach(collectionName => {
            const collRef = collection(db, collectionName);
            const unsubscribe = onSnapshot(collRef, 
                (snapshot) => {
                    const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...parseDates(doc.data()) })) as BaseEntity[];
                    const sortedData = sortData(rawData, collectionName);
                    const setter = stateSetters[collectionName as keyof typeof stateSetters];
                    if (setter) {
                         // @ts-expect-error This is a safe override
                        setter(sortedData);
                    }
                    setError(null);
                }, 
                (err) => {
                    console.error(`Errore nel caricamento di ${collectionName}:`, err);
                    setError(`Impossibile caricare ${collectionName}.`);
                }
            );
            unsubscribes.push(unsubscribe);
        });

        const timer = setTimeout(() => setLoading(false), 1500);

        return () => {
            unsubscribes.forEach(unsub => unsub());
            clearTimeout(timer);
        };

    }, [currentUser]);

    const tecniciMap = useMemo(() => createMap(tecnici), [tecnici]);
    const veicoliMap = useMemo(() => createMap(veicoli), [veicoli]);
    const naviMap = useMemo(() => createMap(navi), [navi]);
    const luoghiMap = useMemo(() => createMap(luoghi), [luoghi]);
    const ditteMap = useMemo(() => createMap(ditte), [ditte]);
    const categorieMap = useMemo(() => createMap(categorie), [categorie]);
    const tipiGiornataMap = useMemo(() => createMap(tipiGiornata), [tipiGiornata]);
    const webAppUsersMap = useMemo(() => createMap(webAppUsers), [webAppUsers]);

    const value: IDataContext = {
        loading, 
        error, 
        tecnici, veicoli, navi, luoghi, ditte, categorie, tipiGiornata, rapportini, clienti, documenti, webAppUsers,
        tecniciMap, veicoliMap, naviMap, luoghiMap, ditteMap, categorieMap, tipiGiornataMap, webAppUsersMap
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
