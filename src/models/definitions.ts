
import type { Table } from 'dexie';

// ==========================================================================
// TIPI DEL DATABASE LOCALE (DEXIE)
// ==========================================================================

export interface Anagrafica {
    id?: number;
    nome: string;
    [key: string]: any;
}

export interface Rapportino {
    id: string;
    data: Date;
    tecnicoId: string;
    nomeLavoro: string;
    oreLavorate?: number;
    dettaglioOreTecnici: { tecnicoId: string; ore: number }[];
    veicoloId?: string;
    km?: number;
    note?: string;
    clienteId?: string;
    naveId?: string;
    dittaId?: string;
    luogoId?: string;
    tipoGiornataId?: string;
    isNoteChanged?: boolean;
    isTask?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Checkin {
    id: string;
    data: Date;
    tecnicoId: string;
    location: { latitude: number; longitude: number };
}

export interface Documento {
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
    | 'tipi_giornata'
    | 'veicoli'
    | 'checkin_giornalieri'
    | 'scadenze';

export type AnagraficaTable = Table<Anagrafica>;
