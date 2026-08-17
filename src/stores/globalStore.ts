
import { create } from 'zustand';
import { User } from 'firebase/auth';
import { Tecnico, Cliente, Veicolo, Cantiere, Ditta, TipoGiornata, Luogo, Nave, Rapportino, Checkin, Documento, Categoria } from '@/models/definitions';

interface AppState {
  user: User | null;
  profile: Tecnico | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  themeMode: 'dark' | 'light';
  tecnici: Tecnico[];
  clienti: Cliente[];
  veicoli: Veicolo[];
  cantieri: Cantiere[];
  ditte: Ditta[];
  tipiGiornata: TipoGiornata[];
  luoghi: Luogo[];
  navi: Nave[];
  categorie: Categoria[];
  rapportini: Rapportino[];
  checkins: Checkin[];
  documenti: Documento[];
  tecniciMap: Map<string, string>;
  clientiMap: Map<string, string>;
  naviMap: Map<string, string>;
  luoghiMap: Map<string, string>;
  tipiGiornataMap: Map<string, TipoGiornata>;
  areAnagraficheLoading: boolean;
  lastUpdated: Date | null;
  conflicts: string[];
  notification: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' };
  dialog: { open: boolean; title: string; message: string; onConfirm: () => void; confirmText?: string; cancelText?: string; };
}

interface AppActions {
  setUserAndProfile: (user: User | null, profile: Tecnico | null) => void;
  setAdminStatus: (isAdmin: boolean) => void;
  setAuthLoading: (isLoading: boolean) => void;
  toggleTheme: () => void;
  logout: () => void;
  setAnagrafiche: (data: {
    tecnici: Tecnico[],
    clienti: Cliente[],
    veicoli: Veicolo[],
    cantieri: Cantiere[],
    ditte: Ditta[],
    tipiGiornata: TipoGiornata[],
    luoghi: Luogo[],
    navi: Nave[],
    categorie: Categoria[],
  }) => void;
  setRapportini: (rapportini: Rapportino[]) => void;
  setCheckins: (checkins: Checkin[]) => void;
  setDocumenti: (documenti: Documento[]) => void;
  setAnagraficheLoading: (loading: boolean) => void;
  setLastUpdated: (date?: Date) => void;
  setConflicts: (conflicts: string[]) => void;
  showNotification: (message: string, severity: AppState['notification']['severity']) => void;
  hideNotification: () => void;
  showDialog: (options: Omit<AppState['dialog'], 'open' | 'onConfirm'> & { onConfirm: () => void }) => void;
  hideDialog: () => void;
}

const initialState: AppState = {
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
  lastUpdated: null,
  conflicts: [],
  notification: { open: false, message: '', severity: 'info' },
  dialog: { open: false, title: '', message: '', onConfirm: () => {} },
};

export const useGlobalStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,
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
  logout: () => {
    set(state => ({
        ...initialState,
        isAuthLoading: false,
        themeMode: state.themeMode,
        user: null,
        profile: null,
        isAuthenticated: false,
        isAdmin: false,
    }));
  },
  setAnagrafiche: (data) => {
    const createMap = (items: any[], nameKey = 'nome', cognomeKey = 'cognome') => 
        new Map(items.map(item => [item.id, `${item[cognomeKey] || ''} ${item[nameKey] || ''}`.trim()]));

    set({
      tecnici: data.tecnici,
      clienti: data.clienti,
      veicoli: data.veicoli,
      cantieri: data.cantieri,
      ditte: data.ditte,
      tipiGiornata: data.tipiGiornata,
      luoghi: data.luoghi,
      navi: data.navi,
      categorie: data.categorie,
      tecniciMap: createMap(data.tecnici),
      clientiMap: createMap(data.clienti), // <-- CORRETTO IL REFUSO DA COGLIONE
      naviMap: createMap(data.navi),
      luoghiMap: createMap(data.luoghi),
      tipiGiornataMap: new Map(data.tipiGiornata.map(t => [t.id, t])),
      areAnagraficheLoading: false,
    });
  },
  setRapportini: (rapportini) => set({ rapportini }),
  setCheckins: (checkins) => set({ checkins }),
  setDocumenti: (documenti) => set({ documenti }),
  setAnagraficheLoading: (loading) => set({ areAnagraficheLoading: loading }),
  setLastUpdated: (date = new Date()) => set({ lastUpdated: date }),
  setConflicts: (conflicts) => set({ conflicts: [...get().conflicts, ...conflicts] }),
  showNotification: (message, severity) => set({ notification: { open: true, message, severity } }),
  hideNotification: () => set(state => ({ ...state, notification: { ...state.notification, open: false } })),
  showDialog: (options) => set({ dialog: { ...options, open: true } }),
  hideDialog: () => set(state => ({ ...state, dialog: { ...state.dialog, open: false } })),
}));
