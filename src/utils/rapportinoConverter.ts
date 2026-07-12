
import type { Rapportino, DettaglioOre } from '@/models/definitions';
import { Timestamp } from 'firebase/firestore';

/**
 * Questa è l'interfaccia STANDARD a cui ogni rapportino deve essere convertito
 * prima di essere utilizzato da qualsiasi componente React.
 */
export interface RapportinoStandard {
    id: string;
    isNew: boolean;
    
    // Campi anagrafici
    tecnicoId: string;
    dataInizio: Date;
    tipoGiornataId: string;

    // Campi di dettaglio
    naveId: string | null;
    luogoId: string | null;
    veicoloId: string | null;
    ordineLavoro: string;
    descrizioneBreve: string;
    lavoroEseguito: string;
    materialiImpiegati: string;

    // Dettaglio ore standardizzato
    dettaglioOre: DettaglioOre[];

    // Metadati originali per il salvataggio
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

    // --- VALORI DI DEFAULT PER UN NUOVO RAPPORTINO ---
    if (isNew) {
        const now = new Date();
        return {
            id: '', // Sarà generato al salvataggio
            isNew: true,
            tecnicoId: '',
            dataInizio: now,
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

    // --- LOGICA DI CONVERSIONE PER UN RAPPORTINO ESISTENTE ---
    const original = rapportino as Rapportino;

    // 1. Conversione Data
    const dataInizio = (original.dataInizio as Timestamp)?.toDate() || (original.data as Timestamp)?.toDate() || new Date();

    // 2. Conversione Lavoro Eseguito e Materiali (per retrocompatibilità)
    let lavoroEseguito = original.lavoroEseguito || '';
    let materialiImpiegati = original.materialiImpiegati || '';
    if (!lavoroEseguito && (original as any).note) {
        const [lavoro, ...materiali] = (original as any).note.split(SEPARATORE_NOTE_LEGACY);
        lavoroEseguito = lavoro || '';
        materialiImpiegati = materiali.join(SEPARATORE_NOTE_LEGACY) || '';
    }

    // 3. Conversione Dettaglio Ore (IL CUORE DEL PROBLEMA)
    const dettaglioOreRaw = original.dettaglioOre || (original as any).dettaglioOreTecnici || [];
    const dettaglioOre: DettaglioOre[] = (dettaglioOreRaw as any[]).map(d => ({
        tecnicoId: d.tecnicoId,
        oraInizio: d.oraInizio || null,
        oraFine: d.oraFine || null,
        // Privilegia le ore esplicite se presenti, altrimenti le lascia undefined
        ore: typeof d.ore === 'number' ? d.ore : undefined,
        isManual: d.isManual || (typeof d.ore === 'number'), // Se ha un campo 'ore' è da considerare manuale
    }));

    return {
        id: original.id,
        isNew: false,
        tecnicoId: original.tecnicoId,
        dataInizio: dataInizio,
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
