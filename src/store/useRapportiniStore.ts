
import { create } from 'zustand';
import { Rapportino, Tecnico, Nave, Cliente, Luogo, TipoGiornata, Veicolo } from '@/models/definitions';
import { Dayjs } from 'dayjs';

// Helper function to create a Map from an array of items with an ID
const createMap = <T extends { id: string }>(items: T[]): Map<string, T> => {
    return new Map(items.map(item => [item.id, item]));
};

interface RapportiniState {
    // Data Arrays
    rapportini: Rapportino[];
    tecnici: Tecnico[];
    navi: Nave[];
    clienti: Cliente[];
    luoghi: Luogo[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];

    // Maps for quick lookup
    tecniciMap: Map<string, Tecnico>;
    naviMap: Map<string, Nave>;
    clientiMap: Map<string, Cliente>;
    luoghiMap: Map<string, Luogo>;
    tipiGiornataMap: Map<string, TipoGiornata>;
    veicoliMap: Map<string, Veicolo>;

    // UI State
    loading: boolean;
    error: string | null;

    // Form State
    isRapportinoFormOpen: boolean;
    editingRapportino: Rapportino | null;
    rapportinoInitialDate?: Dayjs;
}

interface RapportiniActions {
    setData: (data: Partial<Omit<RapportiniState, 'isRapportinoFormOpen' | 'editingRapportino' | 'rapportinoInitialDate'>>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    // Form Actions
    openRapportinoForm: (rapportino?: Rapportino, initialDate?: Dayjs) => void;
    closeRapportinoForm: () => void;
}

const initialState: RapportiniState = {
    rapportini: [],
    tecnici: [],
    navi: [],
    clienti: [],
    luoghi: [],
    tipiGiornata: [],
    veicoli: [],
    tecniciMap: new Map(),
    naviMap: new Map(),
    clientiMap: new Map(),
    luoghiMap: new Map(),
    tipiGiornataMap: new Map(),
    veicoliMap: new Map(),
    loading: true,
    error: null,
    isRapportinoFormOpen: false,
    editingRapportino: null,
    rapportinoInitialDate: undefined,
};

export const useRapportiniStore = create<RapportiniState & RapportiniActions>((set, get) => ({
    ...initialState,
    
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    setData: (data) => {
        const currentState = get();
        const newState = { ...currentState, ...data };

        // If any of the source arrays are updated, regenerate the corresponding map
        if (data.tecnici) newState.tecniciMap = createMap(data.tecnici);
        if (data.navi) newState.naviMap = createMap(data.navi);
        if (data.clienti) newState.clientiMap = createMap(data.clienti);
        if (data.luoghi) newState.luoghiMap = createMap(data.luoghi);
        if (data.tipiGiornata) newState.tipiGiornataMap = createMap(data.tipiGiornata);
        if (data.veicoli) newState.veicoliMap = createMap(data.veicoli);

        set(newState);
    },

    openRapportinoForm: (rapportino, initialDate) => set({
        isRapportinoFormOpen: true,
        editingRapportino: rapportino || null,
        rapportinoInitialDate: initialDate,
    }),

    closeRapportinoForm: () => set({
        isRapportinoFormOpen: false,
        editingRapportino: null,
        rapportinoInitialDate: undefined,
    }),
}));
