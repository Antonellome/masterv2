import { create } from 'zustand';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Scadenza, Veicolo, Tecnico } from '@/models/definitions';

interface ScadenzeStore {
  scadenze: Scadenza[];
  loading: boolean;
  error: string | null;
  fetchScadenze: () => Promise<void>;
  toggleSilence: (id: string) => Promise<void>;
}

const MAPPATURA_SCADENZE_TECNICI: Record<string, string> = {
    scadenzaVisita: "Visita Medica",
    scadenzaPatente: "Patente",
    scadenzaCartaIdentita: "Carta d'Identità",
    scadenzaPassaporto: "Passaporto",
    scadenzaCorsoSicurezza: "Corso Sicurezza",
    scadenzaUnilav: "UNILAV",
    scadenzaCQC: "CQC",
    scadenzaContratto: "Contratto",
    scadenzaAntincendio: "Corso Antincendio",
    scadenzaPrimoSoccorso: "Corso Primo Soccorso",
};

const MAPPATURA_SCADENZE_VEICOLI: Record<string, string> = {
    scadenzaAssicurazione: "Assicurazione",
    scadenzaBollo: "Bollo",
    scadenzaRevisione: "Revisione",
    scadenzaTagliando: "Tagliando",
    scadenzaTachigrafo: "Tachigrafo",
};

const createScadenzaFromItem = (
    item: any, 
    collectionName: 'veicoli' | 'tecnici' | 'documenti', 
    tipo: Scadenza['tipo'], 
    campo: string, 
    nomeCampo: string
): Scadenza | null => {
    const data = item[campo];
    let dataScadenza: Date | null = null;

    if (data instanceof Timestamp) {
        dataScadenza = data.toDate();
    } else if (data instanceof Date) {
        dataScadenza = data;
    } else if (typeof data === 'string' && data.trim() !== '') {
        const parsedDate = new Date(data);
        if (!isNaN(parsedDate.getTime())) {
            dataScadenza = parsedDate;
        }
    }

    // SE LA DATA NON È VALIDA O È ASSENTE, NON CREARE LA SCADENZA. RITORNA NULL.
    if (!dataScadenza) {
        return null;
    }

    const id = `${item.id}-${campo}`;
    let riferimento = '';
    if (item.cognome && item.nome) riferimento = `${item.cognome} ${item.nome}`.trim();
    else if (item.targa) riferimento = item.targa;
    else if (item.marca && item.modello) riferimento = `${item.marca} ${item.modello}`.trim();
    else if (item.nome) riferimento = item.nome;

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const diffTime = dataScadenza.getTime() - oggi.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: Scadenza['status'] = 'ok';
    if (diffDays <= 0) {
        status = 'scaduto';
    } else if (diffDays <= 15) {
        status = 'imminente';
    } else if (diffDays <= 30) {
        status = 'in_scadenza';
    }

    return {
        id,
        data: dataScadenza.toISOString(),
        descrizione: nomeCampo,
        tipo,
        status,
        silenced: item.scadenzeSilenced?.[campo] ?? false,
        riferimento,
        itemOriginaleId: item.id,
        collection: collectionName,
        campoOriginale: campo,
    };
};

export const useScadenzeStore = create<ScadenzeStore>((set, get) => ({
  scadenze: [],
  loading: false,
  error: null,

  fetchScadenze: async () => {
    set({ loading: true, error: null });
    try {
        const [veicoliSnap, tecniciSnap] = await Promise.all([
            getDocs(collection(db, 'veicoli')),
            getDocs(collection(db, 'tecnici')),
        ]);

        const allScadenze: Scadenza[] = [];

        veicoliSnap.forEach(doc => {
            const veicolo = { id: doc.id, ...doc.data() };
            const scadenzeVeicolo = Object.keys(MAPPATURA_SCADENZE_VEICOLI)
                .map(key => createScadenzaFromItem(veicolo, 'veicoli', 'veicoli', key, MAPPATURA_SCADENZE_VEICOLI[key]))
                .filter((s): s is Scadenza => s !== null); // <-- FILTRA VIA I NULL
            allScadenze.push(...scadenzeVeicolo);
        });

        tecniciSnap.forEach(doc => {
            const tecnico = { id: doc.id, ...doc.data() };
            const scadenzeTecnico = Object.keys(MAPPATURA_SCADENZE_TECNICI)
                .map(key => createScadenzaFromItem(tecnico, 'tecnici', 'personali', key, MAPPATURA_SCADENZE_TECNICI[key]))
                .filter((s): s is Scadenza => s !== null); // <-- FILTRA VIA I NULL
            allScadenze.push(...scadenzeTecnico);
        });

        allScadenze.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        set({ scadenze: allScadenze, loading: false });

    } catch (err: unknown) {
        console.error("Errore durante il fetch delle scadenze:", err);
        const message = err instanceof Error ? err.message : 'Errore sconosciuto';
        set({ error: message, loading: false });
    }
  },

  toggleSilence: async (id: string) => {
    const scadenza = get().scadenze.find(s => s.id === id);
    if (!scadenza) return;

    const { itemOriginaleId, collection, campoOriginale, silenced } = scadenza;
    const newSilenceState = !silenced;

    set(state => ({
        scadenze: state.scadenze.map(s => s.id === id ? { ...s, silenced: newSilenceState } : s)
    }));

    try {
        const itemDocRef = doc(db, collection, itemOriginaleId);
        await updateDoc(itemDocRef, {
            [`scadenzeSilenced.${campoOriginale}`]: newSilenceState
        });
    } catch (err) {
        console.error("Errore nel salvare lo stato di silenziamento:", err);
        set(state => ({
            scadenze: state.scadenze.map(s => s.id === id ? { ...s, silenced } : s) 
        }));
    }
  },
}));
