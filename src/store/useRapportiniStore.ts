import { create } from 'zustand';
import { 
    Rapportino, 
    Anagrafica, 
    Categoria,
    Cliente,
    Ditta,
    Luogo,
    Nave,
    TipoGiornata,
    Veicolo,
    Qualifica
} from '@/models/definitions';
import { logger } from '@/utils/logger';

// --- TYPE DEFINITIONS ---
interface AppState {
    rapportini: Rapportino[];
    rapportiniMap: Map<string, Rapportino>;
    tecnici: Anagrafica[];
    tecniciMap: Map<string, Anagrafica>;
    clienti: Cliente[];
    clientiMap: Map<string, Cliente>;
    ditte: Ditta[];
    ditteMap: Map<string, Ditta>;
    luoghi: Luogo[];
    luoghiMap: Map<string, Luogo>;
    navi: Nave[];
    naviMap: Map<string, Nave>;
    categorie: Categoria[];
    categorieMap: Map<string, Categoria>;
    tipiGiornata: TipoGiornata[];
    tipiGiornataMap: Map<string, TipoGiornata>;
    veicoli: Veicolo[];
    veicoliMap: Map<string, Veicolo>;
    qualifiche: Qualifica[];
    qualificheMap: Map<string, Qualifica>;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    setData: (payload: Partial<AppState>) => void;
    addRapportino: (rapportino: Rapportino) => void;
    updateRapportino: (rapportino: Rapportino) => void;
    removeRapportino: (rapportinoId: string) => void;
    getTecnicoNome: (tecnicoId?: string | null) => string;
}

// --- ZUSTAND STORE CREATION ---
export const useRapportiniStore = create<AppState>((set, get) => ({
    // Initial State
    rapportini: [],
    rapportiniMap: new Map(),
    tecnici: [],
    tecniciMap: new Map(),
    clienti: [],
    clientiMap: new Map(),
    ditte: [],
    ditteMap: new Map(),
    luoghi: [],
    luoghiMap: new Map(),
    navi: [],
    naviMap: new Map(),
    categorie: [],
    categorieMap: new Map(),
    tipiGiornata: [],
    tipiGiornataMap: new Map(),
    veicoli: [],
    veicoliMap: new Map(),
    qualifiche: [],
    qualificheMap: new Map(),
    loading: true,

    // Actions
    setLoading: (loading) => set({ loading }),

    // CORREZIONE DEFINITIVA: Sostituita l'implementazione complessa e bacata
    // con la funzione di merge standard di Zustand.
    setData: (payload) => {
        logger.log(`Store: Ricevuto payload da aggiornare`, Object.keys(payload));
        const newState: Partial<AppState> = {};

        // Se il payload contiene dati, crea le mappe corrispondenti per l'efficienza
        for (const key in payload) {
            const stateKey = key as keyof AppState;
            if (Array.isArray(payload[stateKey])) {
                newState[stateKey] = payload[stateKey];
                const mapKey = `${key}Map` as keyof AppState;
                if (key in get()) { // Assicura che la mappa esista nello stato
                    newState[mapKey] = new Map((payload[stateKey] as any[]).map(item => [item.id, item]));
                }
            }
        }
        set(newState);
    },

    addRapportino: (rapportino) => set(state => {
        const newRapportini = [rapportino, ...state.rapportini];
        const newMap = new Map(state.rapportiniMap);
        newMap.set(rapportino.id, rapportino);
        return { rapportini: newRapportini, rapportiniMap: newMap };
    }),

    updateRapportino: (rapportino) => set(state => {
        const newRapportini = state.rapportini.map(r => r.id === rapportino.id ? rapportino : r);
        const newMap = new Map(state.rapportiniMap);
        newMap.set(rapportino.id, rapportino);
        return { rapportini: newRapportini, rapportiniMap: newMap };
    }),

    removeRapportino: (rapportinoId) => set(state => {
        const newRapportini = state.rapportini.filter(r => r.id !== rapportinoId);
        const newMap = new Map(state.rapportiniMap);
        newMap.delete(rapportinoId);
        return { rapportini: newRapportini, rapportiniMap: newMap };
    }),

    getTecnicoNome: (tecnicoId) => {
        if (!tecnicoId) return 'N/A';
        const tecnico = get().tecniciMap.get(tecnicoId);
        return tecnico ? `${tecnico.nome}`.trim() : 'Tecnico non trovato';
    },
}));