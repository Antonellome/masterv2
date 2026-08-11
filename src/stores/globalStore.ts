
import { create } from 'zustand';
import { User } from 'firebase/auth';
import { Tecnico, Cliente, Veicolo, Cantiere, Ditta, TipoGiornata, Luogo, Nave } from '@/models/definitions';

// Definiamo l'interfaccia per lo stato dell'utente e i suoi permessi
interface UserState {
  user: User | null; // L'oggetto User di Firebase
  profile: Tecnico | null; // Il profilo 'Tecnico' dal nostro DB
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean; // Per gestire lo stato di caricamento iniziale
}

// Definiamo l'interfaccia per i dati delle anagrafiche
interface DataState {
  tecnici: Tecnico[];
  clienti: Cliente[];
  veicoli: Veicolo[];
  cantieri: Cantiere[];
  ditte: Ditta[];
  tipiGiornata: TipoGiornata[];
  luoghi: Luogo[];
  navi: Nave[];
  lastUpdated: Date | null;
  loading: boolean; // Per caricamenti specifici delle anagrafiche
}

// Definiamo l'interfaccia per lo stato delle notifiche e dei dialoghi
interface UIState {
  notification: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' };
  dialog: { open: boolean; title: string; content: string; onConfirm: () => void };
}

// Azioni relative all'autenticazione
interface AuthActions {
  setUserAndProfile: (user: User | null, profile: Tecnico | null) => void;
  setAuthLoading: (isLoading: boolean) => void;
  logout: () => void;
}

// Azioni relative ai dati
interface DataActions {
  setData: (data: Partial<DataState>) => void;
  setDataLoading: (loading: boolean) => void;
}

// Azioni relative all'interfaccia utente
interface UIActions {
  showNotification: (message: string, severity: UIState['notification']['severity']) => void;
  hideNotification: () => void;
  showDialog: (title: string, content: string, onConfirm: () => void) => void;
  hideDialog: () => void;
}

// Uniamo tutto in un'unica interfaccia per lo store globale
type GlobalStore = UserState & DataState & UIState & AuthActions & DataActions & UIActions;

const initialState = {
    // User
    user: null,
    profile: null,
    isAdmin: false,
    isAuthenticated: false,
    isLoading: true,
    // Data
    tecnici: [],
    clienti: [],
    veicoli: [],
    cantieri: [],
    ditte: [],
    tipiGiornata: [],
    luoghi: [],
    navi: [],
    lastUpdated: null,
    loading: false,
    // UI
    notification: { open: false, message: '', severity: 'info' as const },
    dialog: { open: false, title: '', content: '', onConfirm: () => {} },
}

export const useGlobalStore = create<GlobalStore>((set, get) => ({
    ...initialState,

    // Implementazione Azioni Auth
    setUserAndProfile: (user, profile) => set({
        user,
        profile,
        isAuthenticated: !!user,
        isAdmin: profile?.isAdmin ?? false,
        isLoading: false,
    }),
    setAuthLoading: (isLoading) => set({ isLoading }),
    logout: () => set({ ...initialState, isLoading: false }),

    // Implementazione Azioni Dati
    setData: (data) => set({ ...data, lastUpdated: new Date(), loading: false }),
    setDataLoading: (loading) => set({ loading }),

    // Implementazione Azioni UI
    showNotification: (message, severity) => set({ notification: { open: true, message, severity } }),
    hideNotification: () => set(state => ({ ...state, notification: { ...state.notification, open: false }})),
    showDialog: (title, content, onConfirm) => set({ dialog: { open: true, title, content, onConfirm } }),
    hideDialog: () => set(state => ({ ...state, dialog: { ...state.dialog, open: false }})),
}));
