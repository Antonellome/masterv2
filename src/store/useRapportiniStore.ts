
import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { 
    Rapportino, 
    Anagrafica, 
    Cliente, 
    Ditta, 
    Scadenza, 
    Checkin, 
    Categoria 
} from '@/models/definitions';
import { logger } from '@/utils/logger';

// --- TYPE DEFINITIONS ---

interface AppState {
    // Core Data
    rapportini: Rapportino[];
    tecnici: Anagrafica[];
    clienti: Cliente[];
    ditte: Ditta[];
    navi: Anagrafica[];
    luoghi: Anagrafica[];
    categorie: Categoria[];
    tipiGiornata: Anagrafica[];
    veicoli: Anagrafica[];
    checkins: Checkin[];
    scadenze: Scadenza[];

    // Look-up Maps for Performance
    rapportiniMap: Map<string, Rapportino>;
    tecniciMap: Map<string, Anagrafica>;
    clientiMap: Map<string, Cliente>;
    ditteMap: Map<string, Ditta>;
    naviMap: Map<string, Anagrafica>;
    luoghiMap: Map<string, Anagrafica>;
    categorieMap: Map<string, Categoria>;
    tipiGiornataMap: Map<string, Anagrafica>;
    veicoliMap: Map<string, Anagrafica>;

    // UI & Loading State
    loading: boolean;
    error: string | null;
    isScadenzaSilenced: boolean;

    // Actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setData: (payload: Partial<Record<keyof AppState, any[]>>) => void;
    toggleScadenzaSilence: (id?: string) => void; 

    // Getters / Selectors
    getClienteNome: (rapportino?: Rapportino) => string;
    getTecnicoNome: (tecnicoId?: string | null) => string;
}

// --- UTILITY FUNCTIONS ---

const toDateSafe = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    
    // Handle serialized dates from callable functions and other formats
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;

    if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
        return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    }
    
    return null;
};

// *** THE REAL FIX (R.6) ***
const sanitizeRapportino = (rapportino: any): Rapportino | null => {
    const finalDate = toDateSafe(rapportino.data) || toDateSafe(rapportino.dataInizio) || toDateSafe(rapportino.createdAt);

    // A rapportino is invalid if it lacks ANY valid date source.
    if (!finalDate) {
        logger.warn(`Rapportino scartato (ID: ${rapportino.id}) perché non ha un campo 'data', 'dataInizio' o 'createdAt' valido.`, {
            originalData: rapportino
        });
        return null;
    }

    const createdAt = toDateSafe(rapportino.createdAt) || finalDate;
    const updatedAt = toDateSafe(rapportino.updatedAt) || createdAt;

    // Create a clean object and remove obsolete fields
    const cleanRapportino: any = { ...rapportino };
    delete cleanRapportino.dataInizio; // Remove obsolete field
    delete cleanRapportino.dettaglioOre; // Remove old incorrect field

    return {
        ...cleanRapportino,
        id: rapportino.id, // Ensure ID is present
        data: finalDate, // The one true date field
        createdAt,
        updatedAt,
        // Ensure the standard field is always an array
        dettaglioOreTecnici: cleanRapportino.dettaglioOreTecnici || [],
    } as Rapportino;
};

// --- ZUSTAND STORE CREATION ---

export const useRapportiniStore = create<AppState>((set, get) => ({
    // Core Data initialization
    rapportini: [],
    tecnici: [],
    clienti: [],
    ditte: [],
    navi: [],
    luoghi: [],
    categorie: [],
    tipiGiornata: [],
    veicoli: [],
    checkins: [],
    scadenze: [],

    // Look-up Maps initialization
    rapportiniMap: new Map(),
    tecniciMap: new Map(),
    clientiMap: new Map(),
    ditteMap: new Map(),
    naviMap: new Map(),
    luoghiMap: new Map(),
    categorieMap: new Map(),
    tipiGiornataMap: new Map(),
    veicoliMap: new Map(),

    // UI & Loading State
    loading: true,
    error: null,
    isScadenzaSilenced: false,

    // --- ACTIONS ---

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    setData: (payload) => set(state => {
        const newState: Partial<AppState> = {};

        for (const key in payload) {
            const stateKey = key as keyof AppState;
            let data = payload[stateKey] || [];
            
            if (stateKey === 'rapportini') {
                const validRapportini = data.map(sanitizeRapportino).filter(Boolean) as Rapportino[];
                // *** THE REAL FIX (R.6) - Sort by the correct 'data' field ***
                newState.rapportini = validRapportini.sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));
                newState.rapportiniMap = new Map(validRapportini.map(r => [r.id, r]));
                if (data.length > 0) {
                     logger.log(`Processati ${data.length} rapportini. Validi: ${validRapportini.length}, Scartati: ${data.length - validRapportini.length}. (Fase R.6)`);
                }
            } else if (stateKey.endsWith('Map')) {
                continue;
            } else if (Array.isArray(data)) {
                (newState[stateKey] as any) = data;
                const mapKey = `${stateKey}Map` as keyof AppState;
                if (mapKey in state) {
                    (newState[mapKey] as any) = new Map(data.map(item => [item.id, item]));
                }
            }
        }
        return newState;
    }),

    toggleScadenzaSilence: (id) => {
        logger.warn("toggleScadenzaSilence is not implemented yet", { id });
    },
    
    // --- GETTERS / SELECTORS ---

    getClienteNome: (rapportino) => {
        if (!rapportino) return 'N/A';
        const { naviMap, luoghiMap } = get();
        if (rapportino.naveId && naviMap.has(rapportino.naveId)) {
            return naviMap.get(rapportino.naveId)!.nome;
        }
        if (rapportino.luogoId && luoghiMap.has(rapportino.luogoId)) {
            return luoghiMap.get(rapportino.luogoId)!.nome;
        }
        return 'Cliente non specificato';
    },

    getTecnicoNome: (tecnicoId) => {
        if (!tecnicoId) return 'N/A';
        const { tecniciMap } = get();
        return tecniciMap.get(tecnicoId)?.nome || 'Tecnico non trovato';
    },
}));
