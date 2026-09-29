
import type { Table } from 'dexie';

// ==========================================================================
// TIPI DEL DATABASE LOCALE (DEXIE)
// ==========================================================================

export interface Anagrafica {
    id?: string;
    nome: string;
    [key: string]: any;
}

export interface Rapportino {
    id: string;
    clienteId: string;
    completed: boolean;
    createdAt: any; 
    createdBy: string;
    data: any; 
    descrizioneBreve: string;
    dettaglioOreTecnici: {
        isManual: boolean;
        nome: string;
        oraFine: string;
        oraInizio: string;
        ore: number;
        pausa: number;
        tecnicoId: string;
    }[];
    dittaId: string;
    firmaFirmatarioNome: string;
    firmaFirmatarioSocieta: string;
    firmaVettoriale: string;
    includeTrasferta: boolean;
    isDeleted: boolean;
    isLocked: boolean;
    lavoroEseguito: string;
    luogoId: string;
    materialiImpiegati: string;
    naveId: string;
    nome: string;
    ordineLavoro: string;
    oreLavoro: number;
    presenze: string[];
    tecnicoId: string;
    tecnicoScriventeId: string;
    tipoGiornataId: string;
    trasfertaId: string;
    updatedAt: any;
    userId: string;
    veicoloId: string;
    version: number;
}

export interface Cliente {
    id?: string;
    nome: string;
    [key: string]: any;
}

export interface Ditta {
    id?: string;
    nome: string;
    [key: string]: any;
}

export interface Luogo {
    id?: string;
    nome: string;
    [key: string]: any;
}

export interface Nave {
    id?: string;
    nome: string;
    clienteId: string;
    [key: string]: any;
}

export interface Categoria {
    id?: string;
    nome: string;
    [key: string]: any;
}

export interface TipoGiornata {
    id?: string;
    nome: string;
    [key: string]: any;
}

export interface Veicolo {
    id?: string;
    nome: string;
    [key: string]: any;
}

export interface Checkin {
    id: string;
    data: Date;
    tecnicoId: string;
    location: { latitude: number; longitude: number };
}

export interface Scadenza {
    id: string;
    nome: string;
    dataScadenza: Date;
    tipo: 'personale' | 'veicolo' | 'attrezzatura';
    ownerId: string;
}


// ==========================================================================
// TIPI DELLO STORE GLOBALE (ZUSTAND)
// ==========================================================================

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationState {
    message: string;
    type: NotificationType;
    open: boolean;
}

export interface DialogState {
    open: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    cancelText?: string;
    confirmText?: string;
}

/**
 * Stato globale della UI gestito da Zustand.
 */
export interface GlobalState {
    appLoading: boolean;
    lastSync: Date | null;
    isSidebarOpen: boolean;
    notification: NotificationState;
    dialog: DialogState;
}

/**
 * Azioni per modificare lo stato globale della UI.
 */
export interface GlobalActions {
    setAppLoading: (loading: boolean) => void;
    setLastSync: (syncDate: Date) => void;
    setIsSidebarOpen: (isOpen: boolean) => void;
    toggleSidebar: () => void;
    showNotification: (message: string, type?: NotificationType) => void;
    hideNotification: () => void;
    showDialog: (options: Omit<DialogState, 'open'>) => void;
    hideDialog: () => void;
}

// ==========================================================================
// ALTRI TIPI
// ==========================================================================

export type CollectionName =
    | 'rapportini'
    | 'tecnici'
    | 'clienti'
    | 'ditte'
    | 'navi'
    | 'luoghi'
    | 'categorie'
    | 'tipiGiornata' // Corretto da 'tipi_giornata'
    | 'veicoli'
    | 'checkin_giornalieri'
    | 'documenti'; // Corretto da 'scadenze'


export type AnagraficaTable = Table<Anagrafica>;
