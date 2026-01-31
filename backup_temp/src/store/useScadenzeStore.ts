import { create } from 'zustand';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { veicoloConverter, tecnicoConverter, documentoConverter } from '@/utils/converters';
import type { Scadenza, Veicolo, Tecnico, Documento } from '@/models/definitions';

interface ScadenzeStore {
  scadenze: Scadenza[];
  loading: boolean;
  error: string | null;
  fetchScadenze: () => Promise<void>;
  toggleSilence: (id: string) => Promise<void>;
}

const MAPPATURA_SCADENZE_TECNICI: Record<keyof Tecnico, string> = {
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

const createScadenzaFromItem = (item: Veicolo | Tecnico | Documento, collectionName: 'veicoli' | 'tecnici' | 'documenti', tipo: Scadenza['tipo'], campo: string, nomeCampo: string): Scadenza | null => {
    const data = item[campo];
    if (!data) return null;

    let dataScadenza: Date;
    if (data instanceof Timestamp) {
        dataScadenza = data.toDate();
    } else if (data instanceof Date) {
        dataScadenza = data;
    } else if (typeof data === 'string') {
        dataScadenza = new Date(data);
    } else {
        return null;
    }

    if (isNaN(dataScadenza.getTime())) return null;

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const diffTime = dataScadenza.getTime() - oggi.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // NUOVA REGOLA: Non mostrare scadenze oltre i 30 giorni
    if (diffDays > 30) {
        return null;
    }

    let status: Scadenza['status'] = 'ok';
    // NUOVA REGOLA COLORI:
    if (diffDays <= 15) { // Da 15 giorni in giù (compresi scaduti) è rosso
        status = 'scaduto';
    } else if (diffDays <= 30) { // Da 16 a 30 giorni è giallo
        status = 'imminente';
    }

    const id = `${item.id}-${campo}`;
    let riferimento = '';
    if ('cognome' in item && 'nome' in item) riferimento = `${item.cognome} ${item.nome}`.trim();
    else if ('targa' in item) riferimento = item.targa;
    else if ('nome' in item) riferimento = item.nome;

    return {
        id,
        data: dataScadenza.toISOString(),
        descrizione: nomeCampo,
        tipo,
        status, // Lo stato ora rispetta le nuove regole
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
        const [veicoliSnap, tecniciSnap, documentiSnap] = await Promise.all([
            getDocs(collection(db, 'veicoli').withConverter(veicoloConverter)),
            getDocs(collection(db, 'tecnici').withConverter(tecnicoConverter)),
            getDocs(collection(db, 'documenti').withConverter(documentoConverter)),
        ]);

        const allScadenze: Scadenza[] = [];

        veicoliSnap.forEach(doc => {
            const veicolo = doc.data();
            allScadenze.push(...[
                createScadenzaFromItem(veicolo, 'veicoli', 'veicoli', 'scadenzaAssicurazione', 'Assicurazione'),
                createScadenzaFromItem(veicolo, 'veicoli', 'veicoli', 'scadenzaBollo', 'Bollo'),
                createScadenzaFromItem(veicolo, 'veicoli', 'veicoli', 'scadenzaRevisione', 'Revisione'),
                createScadenzaFromItem(veicolo, 'veicoli', 'veicoli', 'scadenzaTagliando', 'Tagliando'),
                createScadenzaFromItem(veicolo, 'veicoli', 'veicoli', 'scadenzaTachigrafo', 'Tachigrafo'),
            ].filter((s): s is Scadenza => s !== null));
        });

        tecniciSnap.forEach(doc => {
            const tecnico = doc.data();
            const scadenzeTecnico = Object.keys(MAPPATURA_SCADENZE_TECNICI)
                .map(key => createScadenzaFromItem(tecnico, 'tecnici', 'personali', key, MAPPATURA_SCADENZE_TECNICI[key as keyof Tecnico]))
                .filter((s): s is Scadenza => s !== null);
            allScadenze.push(...scadenzeTecnico);
        });

        documentiSnap.forEach(doc => {
            const documento = doc.data();
            allScadenze.push(...[
                createScadenzaFromItem(documento, 'documenti', 'documenti', 'scadenza1', documento.nome || 'Scadenza 1'),
                createScadenzaFromItem(documento, 'documenti', 'documenti', 'scadenza2', documento.nome || 'Scadenza 2'),
            ].filter((s): s is Scadenza => s !== null));
        });

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
            scadenze: state.scadenze.map(s => s.id === id ? { ...s, silenced } : s) // Ripristina
        }));
    }
  },
}));
