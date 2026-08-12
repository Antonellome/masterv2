
import { create } from 'zustand';
import { User } from 'firebase/auth';
// Aggiungo Categoria e rimuovo la mia invenzione Qualifica
import { Tecnico, Cliente, Veicolo, Cantiere, Ditta, TipoGiornata, Luogo, Nave, Rapportino, Checkin, Documento, Categoria } from '@/models/definitions';

// Interfaccia per lo stato completo
interface AppState {
  // --- Slice Utente e Autenticazione ---
  user: User | null;
  profile: Tecnico | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isAuthLoading: boolean;

  // --- Slice Dati Principali ---
  tecnici: Tecnico[];
  clienti: Cliente[];
  veicoli: Veicolo[];
  cantieri: Cantiere[];
  ditte: Ditta[];
  tipiGiornata: TipoGiornata[];
  luoghi: Luogo[];
  navi: Nave[];
  categorie: Categoria[]; // <-- AGGIUNTO CORRETTAMENTE
  rapportini: Rapportino[];
  checkins: Checkin[];
  documenti: Documento[];

  // Mappe per accesso rapido
  tecniciMap: Map<string, string>;
  clientiMap: Map<string, string>;
  naviMap: Map<string, string>;
  luoghiMap: Map<string, string>;
  tipiGiornataMap: Map<string, TipoGiornata>;

  // Stato di caricamento
  areAnagraficheLoading: boolean;
  lastUpdated: Date | null;
  conflicts: string[];
  
  // --- Slice UI ---
  notification: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' };
  dialog: { open: boolean; title: string; message: string; onConfirm: () => void; confirmText?: string; cancelText?: string; };
}

// Interfaccia per le azioni
interface AppActions {
  // Azioni Auth
  setUserAndProfile: (user: User | null, profile: Tecnico | null) => void;
  setAuthLoading: (isLoading: boolean) => void;
  logout: () => void;

  // Azioni Dati
  setAnagrafiche: (data: {
    tecnici: Tecnico[],
    clienti: Cliente[],
    veicoli: Veicolo[],
    cantieri: Cantiere[],
    ditte: Ditta[],
    tipiGiornata: TipoGiornata[],
    luoghi: Luogo[],
    navi: Nave[],
    categorie: Categoria[], // <-- AGGIUNTO CORRETTAMENTE
  }) => void;
  setRapportini: (rapportini: Rapportino[]) => void;
  setCheckins: (checkins: Checkin[]) => void;
  setDocumenti: (documenti: Documento[]) => void;
  setAnagraficheLoading: (loading: boolean) => void;
  setLastUpdated: (date?: Date) => void;
  setConflicts: (conflicts: string[]) => void;

  // Azioni UI
  showNotification: (message: string, severity: AppState['notification']['severity']) => void;
  hideNotification: () => void;
  showDialog: (options: Omit<AppState['dialog'], 'open' | 'onConfirm'> & { onConfirm: () => void }) => void;
  hideDialog: () => void;
}

// Stato iniziale
const initialState: AppState = {
  user: null,
  profile: null,
  isAdmin: false,
  isAuthenticated: false,
  isAuthLoading: true,

  tecnici: [],
  clienti: [],
  veicoli: [],
  cantieri: [],
  ditte: [],
  tipiGiornata: [],
  luoghi: [],
  navi: [],
  categorie: [], // <-- AGGIUNTO CORRETTAMENTE
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

// Creazione dello store
export const useGlobalStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,

  // Implementazione Azioni Auth
  setUserAndProfile: (user, profile) => set({
    user,
    profile,
    isAuthenticated: !!user && !!profile,
    isAdmin: profile?.isAdmin ?? false,
    isAuthLoading: false,
  }),
  setAuthLoading: (isLoading) => set({ isAuthLoading: isLoading }),
  logout: () => {
    set(state => ({
        ...initialState,
        isAuthLoading: false,
        // Manteniamo le anagrafiche per l'uso offline
        tecnici: state.tecnici,
        clienti: state.clienti,
        veicoli: state.veicoli,
        cantieri: state.cantieri,
        ditte: state.ditte,
        tipiGiornata: state.tipiGiornata,
        luoghi: state.luoghi,
        navi: state.navi,
        categorie: state.categorie, // <-- AGGIUNTO CORRETTAMENTE
        documenti: state.documenti,
    }));
  },

  // Implementazione Azioni Dati
  setAnagrafiche: (data) => {
    const createMap = (items: any[], nameKey = 'nome', cognomeKey = 'cognome') => 
        new Map(items.map(item => [item.id, `${item[cognomeKey] || ''} ${item[nameKey] || ''}`.trim()]));

    set({
      ...data,
      tecniciMap: createMap(data.tecnici),
      clientiMap: createMap(data.clienti),
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
  
  // Implementazione Azioni UI
  showNotification: (message, severity) => set({ notification: { open: true, message, severity } }),
  hideNotification: () => set(state => ({ ...state, notification: { ...state.notification, open: false } })),
  showDialog: (options) => set({ dialog: { ...options, open: true } }),
  hideDialog: () => set(state => ({ ...state, dialog: { ...state.dialog, open: false } })),
}));
