import { create } from 'zustand';
import { User } from 'firebase/auth';
import { Tecnico, Cliente, Veicolo, Cantiere, Ditta, TipoGiornata, Luogo, Nave, Rapportino, Checkin, Documento, Categoria } from '@/models/definitions';

// 1. Definizioni dei tipi corrette per le Mappe
interface AppState {
  user: User | null;
  profile: Tecnico | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  themeMode: 'dark' | 'light';
  // Array di anagrafiche
  tecnici: Tecnico[];
  clienti: Cliente[];
  veicoli: Veicolo[];
  cantieri: Cantiere[];
  ditte: Ditta[];
  tipiGiornata: TipoGiornata[];
  luoghi: Luogo[];
  navi: Nave[];
  categorie: Categoria[];
  // Dati operativi
  rapportini: Rapportino[];
  checkins: Checkin[];
  documenti: Documento[];
  // MAPPE CORRETTE: memorizzano l'intero oggetto
  tecniciMap: Map<string, Tecnico>;
  clientiMap: Map<string, Cliente>;
  naviMap: Map<string, Nave>;
  luoghiMap: Map<string, Luogo>;
  tipiGiornataMap: Map<string, TipoGiornata>;
  // Stati dell'UI e della sincronizzazione
  areAnagraficheLoading: boolean;
  isSyncInProgress: boolean;
  lastUpdated: Date | null;
  notification: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' };
  dialog: { open: boolean; title: string; message: string; onConfirm: () => void; confirmText?: string; cancelText?: string; };

  // Azioni definite nello store
  addRapportinoToStore: (rapportino: Rapportino) => void;
  updateRapportinoInStore: (rapportino: Rapportino) => void;
  removeRapportino: (rapportinoId: string) => void;
  getRapportinoById: (rapportinoId: string) => Rapportino | undefined;
}

interface AppActions {
  setUserAndProfile: (user: User | null, profile: Tecnico | null) => void;
  setAdminStatus: (isAdmin: boolean) => void;
  setAuthLoading: (isLoading: boolean) => void;
  toggleTheme: () => void;
  logout: () => void;
  setAnagrafiche: (data: Partial<Pick<AppState, 'tecnici' | 'clienti' | 'veicoli' | 'cantieri' | 'ditte' | 'tipiGiornata' | 'luoghi' | 'navi' | 'categorie'>>) => void;
  setRapportini: (rapportini: Rapportino[]) => void;
  setCheckins: (checkins: Checkin[]) => void;
  setDocumenti: (documenti: Documento[]) => void;
  setAnagraficheLoading: (loading: boolean) => void;
  setIsSyncInProgress: (isSyncing: boolean) => void;
  setLastUpdated: (date?: Date) => void;
  showNotification: (message: string, severity: AppState['notification']['severity']) => void;
  hideNotification: () => void;
  showDialog: (options: Omit<AppState['dialog'], 'open' | 'onConfirm'> & { onConfirm: () => void }) => void;
  hideDialog: () => void;
}

const initialState: Omit<AppState, 'addRapportinoToStore' | 'updateRapportinoInStore' | 'removeRapportino' | 'getRapportinoById'> = {
  user: null,
  profile: null,
  isAdmin: false,
  isAuthenticated: false,
  isAuthLoading: true,
  themeMode: 'dark',
  tecnici: [],
  clienti: [],
  veicoli: [],
  cantieri: [],
  ditte: [],
  tipiGiornata: [],
  luoghi: [],
  navi: [],
  categorie: [],
  rapportini: [],
  checkins: [],
  documenti: [],
  tecniciMap: new Map(),
  clientiMap: new Map(),
  naviMap: new Map(),
  luoghiMap: new Map(),
  tipiGiornataMap: new Map(),
  areAnagraficheLoading: true,
  isSyncInProgress: false,
  lastUpdated: null,
  notification: { open: false, message: '', severity: 'info' },
  dialog: { open: false, title: '', message: '', onConfirm: () => {} },
};

export const useGlobalStore = create<AppState & AppActions>((set, get) => ({
  ...(initialState as AppState),
  setUserAndProfile: (user, profile) => set({
    user,
    profile,
    isAuthenticated: !!user,
    isAuthLoading: false,
  }),
  setAdminStatus: (isAdmin) => set({ isAdmin }),
  setAuthLoading: (isLoading) => set({ isAuthLoading: isLoading }),
  toggleTheme: () => set(state => {
    const newThemeMode = state.themeMode === 'light' ? 'dark' : 'light';
    localStorage.setItem('themeMode', newThemeMode);
    return { themeMode: newThemeMode };
  }),
  logout: () => set(state => ({ ...initialState, isAuthLoading: false, themeMode: state.themeMode })),
  
  // 2. Logica `setAnagrafiche` corretta: crea mappe di oggetti completi
  setAnagrafiche: (data) => {
    const createObjectMap = <T extends { id: string }>(items: T[] = []): Map<string, T> => 
        new Map(items.map(item => [item.id, item]));

    set({
      tecnici: data.tecnici || [],
      clienti: data.clienti || [],
      veicoli: data.veicoli || [],
      cantieri: data.cantieri || [],
      ditte: data.ditte || [],
      tipiGiornata: data.tipiGiornata || [],
      luoghi: data.luoghi || [],
      navi: data.navi || [],
      categorie: data.categorie || [],
      // ORA LE MAPPE CONTENGONO L'OGGETTO INTERO
      tecniciMap: createObjectMap(data.tecnici),
      clientiMap: createObjectMap(data.clienti),
      naviMap: createObjectMap(data.navi),
      luoghiMap: createObjectMap(data.luoghi),
      tipiGiornataMap: createObjectMap(data.tipiGiornata),
      areAnagraficheLoading: false,
    });
  },
  setRapportini: (rapportini) => set({ rapportini: rapportini || [] }),
  addRapportinoToStore: (rapportino) => set(state => ({ rapportini: [...state.rapportini, rapportino] })),
  updateRapportinoInStore: (rapportino) => set(state => ({
      rapportini: state.rapportini.map(r => r.id === rapportino.id ? rapportino : r)
  })),
  removeRapportino: (rapportinoId) => set(state => ({ 
      rapportini: state.rapportini.filter(r => r.id !== rapportinoId) 
  })),
  getRapportinoById: (rapportinoId: string) => get().rapportini.find(r => r.id === rapportinoId),
  
  setCheckins: (checkins) => set({ checkins: checkins || [] }),
  setDocumenti: (documenti) => set({ documenti: documenti || [] }),
  setAnagraficheLoading: (loading) => set({ areAnagraficheLoading: loading }),
  setIsSyncInProgress: (isSyncing) => set({ isSyncInProgress: isSyncing }),
  setLastUpdated: (date = new Date()) => set({ lastUpdated: date }),
  showNotification: (message, severity) => set({ notification: { open: true, message, severity } }),
  hideNotification: () => set(state => ({ ...state, notification: { ...state.notification, open: false } })),
  showDialog: (options) => set({ dialog: { ...options, open: true } }),
  hideDialog: () => set(state => ({ ...state, dialog: { ...state.dialog, open: false } })),
}));
