import { create } from 'zustand';
import { Rapportino, Tecnico, Nave, Cliente, Luogo, TipoGiornata } from '@/models/definitions';

// Helper function to create a Map from an array of items with an ID
const createMap = <T extends { id: string }>(items: T[]): Map<string, T> => {
    return new Map(items.map(item => [item.id, item]));
};

interface RapportiniState {
    // Arrays
    rapportini: Rapportino[];
    tecnici: Tecnico[];
    navi: Nave[];
    clienti: Cliente[];
    luoghi: Luogo[];
    tipiGiornata: TipoGiornata[];

    // Maps for quick lookup
    tecniciMap: Map<string, Tecnico>;
    naviMap: Map<string, Nave>;
    clientiMap: Map<string, Cliente>;
    luoghiMap: Map<string, Luogo>;
    tipiGiornataMap: Map<string, TipoGiornata>;

    loading: boolean;
    error: string | null;
}

interface RapportiniActions {
    setData: (data: Partial<RapportiniState>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

const initialState: RapportiniState = {
    rapportini: [],
    tecnici: [],
    navi: [],
    clienti: [],
    luoghi: [],
    tipiGiornata: [],
    tecniciMap: new Map(),
    naviMap: new Map(),
    clientiMap: new Map(),
    luoghiMap: new Map(),
    tipiGiornataMap: new Map(),
    loading: true,
    error: null,
};

export const useRapportiniStore = create<RapportiniState & RapportiniActions>((set, get) => ({
    ...initialState,
    
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    setData: (data) => {
        const currentState = get();
        const newState = { ...currentState, ...data };

        // If any of the source arrays are updated, regenerate the corresponding map
        if (data.tecnici) {
            newState.tecniciMap = createMap(data.tecnici);
        }
        if (data.navi) {
            newState.naviMap = createMap(data.navi);
        }
        if (data.clienti) {
            newState.clientiMap = createMap(data.clienti);
        }
        if (data.luoghi) {
            newState.luoghiMap = createMap(data.luoghi);
        }
        if (data.tipiGiornata) {
            newState.tipiGiornataMap = createMap(data.tipiGiornata);
        }

        set(newState);
    },
}));
