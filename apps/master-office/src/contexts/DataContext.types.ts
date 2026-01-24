import { createContext } from 'react';
import type {
    Tecnico, Veicolo, Nave, Luogo, Ditta, Categoria, TipoGiornata, Rapportino, Cliente, Documento, WebAppUser, Qualifica, CollectionName
} from '@/models/definitions';
import type { DocumentData } from 'firebase/firestore';

// Questo definisce la struttura dei dati forniti dal DataContext
export interface IDataContext {
    // --- Raw Data Arrays ---
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
    qualifiche: Qualifica[];
    webAppUsers?: WebAppUser[]; // Optional for now

    // --- Mapped Data for quick access ---
    tecniciMap: Map<string, Tecnico>;
    veicoliMap: Map<string, Veicolo>;
    naviMap: Map<string, Nave>;
    luoghiMap: Map<string, Luogo>;
    ditteMap: Map<string, Ditta>;
    categorieMap: Map<string, Categoria>;
    tipiGiornataMap: Map<string, TipoGiornata>;
    qualificheMap: Map<string, Qualifica>;
    webAppUsersMap?: Map<string, WebAppUser>; // Optional for now

    // --- Status ---
    loading: boolean;
    error: string | null;

    // --- Data Manipulation Methods ---
    addData: (collectionName: CollectionName, data: DocumentData) => Promise<void>;
    updateData: (collectionName: CollectionName, id: string, data: DocumentData) => Promise<void>;
    deleteData: (collectionName: CollectionName, id: string) => Promise<void>;
    refreshData: (collections: CollectionName[]) => void;
}

// Creazione del contesto con un valore di default undefined
export const DataContext = createContext<IDataContext | undefined>(undefined);
