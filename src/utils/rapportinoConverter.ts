
import type { Rapportino, DettaglioOre } from '@/models/definitions';

/**
 * Questa è l'interfaccia STANDARD a cui ogni rapportino deve essere convertito
 * prima di essere utilizzato da qualsiasi componente React.
 */
export interface RapportinoStandard {
    id: string;
    isNew: boolean;
    tecnicoId: string;
    dataInizio: any; 
    tipoGiornataId: string;
    naveId: string | null;
    luogoId: string | null;
    veicoloId: string | null;
    ordineLavoro: string;
    descrizioneBreve: string;
    lavoroEseguito: string;
    materialiImpiegati: string;
    dettaglioOre: DettaglioOre[];
    originalData: Rapportino;
}

const SEPARATORE_NOTE_LEGACY = '\n\n---\n\n';

/**
 * Converte qualsiasi versione di un oggetto Rapportino in un unico
 * formato standardizzato (RapportinoStandard) che i componenti UI possono utilizzare in sicurezza.
 * 
 * @param rapportino L'oggetto rapportino proveniente da Firestore.
 * @returns Un oggetto RapportinoStandard, pulito e prevedibile.
 */
export function convertToRapportinoStandard(rapportino: Partial<Rapportino> | null): RapportinoStandard {
    const isNew = !rapportino || !rapportino.id;

    if (isNew) {
        return {
            id: '', 
            isNew: true,
            tecnicoId: '',
            dataInizio: new Date(),
            tipoGiornataId: '',
            naveId: null,
            luogoId: null,
            veicoloId: null,
            ordineLavoro: '',
            descrizioneBreve: '',
            lavoroEseguito: '',
            materialiImpiegati: '',
            dettaglioOre: [],
            originalData: {} as Rapportino,
        };
    }

    const original = rapportino as Rapportino;

    // --- LA CORREZIONE. NESSUNA CONVERSIONE. NESSUNA IPOTESI. ---
    // Passiamo il dato grezzo (che sia un Timestamp o un oggetto {seconds: ...}).
    // La responsabilità di interpretarlo è del componente che lo usa, tramite `parseToDayjs`.
    const dataInizio = original.dataInizio || original.data;

    let lavoroEseguito = original.lavoroEseguito || '';
    let materialiImpiegati = original.materialiImpiegati || '';
    if (!lavoroEseguito && (original as any).note) {
        const [lavoro, ...materiali] = (original as any).note.split(SEPARATORE_NOTE_LEGACY);
        lavoroEseguito = lavoro || '';
        materialiImpiegati = materiali.join(SEPARATORE_NOTE_LEGACY) || '';
    }

    const dettaglioOreRaw = original.dettaglioOre || (original as any).dettaglioOreTecnici || [];
    const dettaglioOre: DettaglioOre[] = (dettaglioOreRaw as any[]).map(d => ({
        tecnicoId: d.tecnicoId,
        oraInizio: d.oraInizio || null,
        oraFine: d.oraFine || null,
        ore: typeof d.ore === 'number' ? d.ore : undefined,
        isManual: d.isManual || (typeof d.ore === 'number'),
    }));

    return {
        id: original.id,
        isNew: false,
        tecnicoId: original.tecnicoId,
        dataInizio: dataInizio, // Ecco il dato, non corrotto.
        tipoGiornataId: original.tipoGiornataId || '',
        naveId: original.naveId || null,
        luogoId: original.luogoId || null,
        veicoloId: original.veicoloId || null,
        ordineLavoro: original.ordineLavoro || '',
        descrizioneBreve: original.descrizioneBreve || '',
        lavoroEseguito: lavoroEseguito,
        materialiImpiegati: materialiImpiegati,
        dettaglioOre: dettaglioOre,
        originalData: original,
    };
}
