import { Rapportino, Tecnico, Nave, Ditta, CategoriaTecnico, TipoGiornata, Impostazioni } from "@/models/definitions";
import dayjs from "dayjs";

// --- TIPI DI STRUTTURE DATI ---

/**
 * Dati grezzi necessari per il calcolo, provenienti dal database.
 */
export interface RawData {
    rapportini: Rapportino[];
    tipiGiornata: TipoGiornata[];
    impostazioni: Impostazioni | undefined;
    navi: Nave[];
}

/**
 * Struttura dati intermedia che contiene le ore aggregate per un singolo giorno di un tecnico.
 */
export interface DailyHours {
    oreDaSplittare: number;
    notte: number;
    causali: Map<string, number>; // Es. {'FERIE': 8, 'MALATTIA': 4}
}

/**
 * Struttura dati finale per la visualizzazione nella tabella a matrice.
 */
export interface MatrixReportData {
    [tecnicoId: string]: {
        [day: number]: string; // Es. { 1: '8+2', 2: '8F', ... }
    };
}

/**
 * Struttura dati che raggruppa i dati finali per nave.
 */
export interface GroupedMatrixReportData {
    [naveId: string]: {
        naveNome: string;
        reportData: MatrixReportData;
        tecnici: Tecnico[];
    };
}

// --- FUNZIONE PRINCIPALE DI CALCOLO ---

/**
 * Calcola i dati per il report a matrice basandosi sulla logica di calcolo.md.
 * @param selectedTecnici Tecnici scelti per il report.
 * @param selectedMonth Mese per cui generare il report.
 * @param rawData Dati grezzi dal DB.
 * @param selectedNavi Navi selezionate per filtrare i dati (opzionale).
 * @returns Una struttura dati pronta per essere renderizzata dalla tabella a matrice.
 */
export const calcolaDatiReportMatrice = (
    selectedTecnici: Tecnico[],
    selectedMonth: dayjs.Dayjs,
    rawData: RawData,
    selectedNavi: Nave[] = []
): GroupedMatrixReportData => {

    const { rapportini, tipiGiornata, navi } = rawData;
    const tipiGiornataMap = new Map(tipiGiornata.map(t => [t.id, t]));
    const naviMap = new Map(navi.map(n => [n.id, n]));

    // --- FASE 1: FILTRAGGIO E ARRICCHIMENTO PRELIMINARE ---

    const meseInizio = selectedMonth.startOf('month');
    const meseFine = selectedMonth.endOf('month');
    const idTecniciSelezionati = new Set(selectedTecnici.map(t => t.id));
    const idNaviSelezionate = selectedNavi.length > 0 ? new Set(selectedNavi.map(n => n.id)) : null;

    const rapportiniDelMese = rapportini.filter(r => {
        const dataRapportino = dayjs(r.data);
        const nelMese = dataRapportino.isBetween(meseInizio, meseFine, null, '[]');
        if (!nelMese) return false;

        const haTecnicoSelezionato = r.dettaglioOreTecnici?.some(d => idTecniciSelezionati.has(d.tecnicoId)) ?? idTecniciSelezionati.has(r.tecnicoId!);
        if (!haTecnicoSelezionato) return false;
        
        if (idNaviSelezionate && !idNaviSelezionate.has(r.naveId!)) {
            return false;
        }

        return true;
    });

    // --- FASE 2: AGGREGAZIONE DATI A MATRICE ---

    // Struttura: Map<tecnicoId, Map<giorno, DailyHours>>
    const matriceDatiGrezzi = new Map<string, Map<number, DailyHours>>();

    // Inizializza la matrice per tutti i tecnici selezionati
    for (const tecnico of selectedTecnici) {
        matriceDatiGrezzi.set(tecnico.id, new Map());
    }

    for (const r of rapportiniDelMese) {
        const giorno = dayjs(r.data).date();
        const nave = r.naveId ? naviMap.get(r.naveId) : undefined;
        const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);

        const dettagliTecnici = r.dettaglioOreTecnici && r.dettaglioOreTecnici.length > 0 
            ? r.dettaglioOreTecnici 
            : [{ tecnicoId: r.tecnicoId!, ore: r.oreLavoro ?? 0 }];

        for (const dettaglio of dettagliTecnici) {
            if (!idTecniciSelezionati.has(dettaglio.tecnicoId)) continue;

            const tecnicoMap = matriceDatiGrezzi.get(dettaglio.tecnicoId)!;
            if (!tecnicoMap.has(giorno)) {
                tecnicoMap.set(giorno, { oreDaSplittare: 0, notte: 0, causali: new Map() });
            }
            const dailyHours = tecnicoMap.get(giorno)!;

            const ore = dettaglio.ore ?? 0;
            if (ore === 0) continue;

            // Regola Notte (Cartour)
            const isNotte = nave?.nome.toLowerCase().includes('cartour') && dayjs(r.orarioInizio).hour() >= 21;
            if (isNotte) {
                dailyHours.notte += ore;
                continue;
            }

            // Vecchi report trasferta -> ore ordinarie
            if (tipoGiornata?.categoria === 'trasferta') {
                 dailyHours.oreDaSplittare += ore;
                 continue;
            }
            
            if (r.tipoGiornataId === 't_ordinaria') {
                dailyHours.oreDaSplittare += ore;
            } else {
                const causaleId = tipoGiornata?.sigla || tipoGiornata?.nome || r.tipoGiornataId;
                const oreAttuali = dailyHours.causali.get(causaleId) || 0;
                dailyHours.causali.set(causaleId, oreAttuali + ore);
            }
        }
    }

    // --- FASE 3: FINALIZZAZIONE E SPLIT ---

    const reportFinale: GroupedMatrixReportData = {};
    const naviDaIterare = idNaviSelezionate ? selectedNavi : [{ id: 'default', nome: 'Generale' } as Nave];

    for (const nave of naviDaIterare) {
        const reportData: MatrixReportData = {};
        const tecniciInNave = new Set<string>();

        for (const tecnico of selectedTecnici) {
            const tecnicoMap = matriceDatiGrezzi.get(tecnico.id);
            if (!tecnicoMap) continue;

            const tecnicoRow: { [day: number]: string } = {};

            for (const [giorno, dailyHours] of tecnicoMap.entries()) {

                // Se stiamo ciclando navi specifiche, assicuriamoci che questo dato appartenga alla nave corretta
                if (idNaviSelezionate) {
                    const rapportinoDelGiorno = rapportiniDelMese.find(r => dayjs(r.data).date() === giorno && (r.dettaglioOreTecnici?.some(d => d.tecnicoId === tecnico.id) || r.tecnicoId === tecnico.id));
                    if (rapportinoDelGiorno?.naveId !== nave.id) {
                        continue;
                    }
                }
                
                tecniciInNave.add(tecnico.id);

                let cella = '';

                const oreOrdinarie = Math.min(dailyHours.oreDaSplittare, 8);
                const oreStraordinarie = Math.max(0, dailyHours.oreDaSplittare - 8);

                if (oreOrdinarie > 0) cella += `${oreOrdinarie}`;
                if (oreStraordinarie > 0) cella += `${cella ? '+' : ''}${oreStraordinarie}`;
                if (dailyHours.notte > 0) {
                    if (oreOrdinarie > 0 || oreStraordinarie > 0) {
                         cella += `+${dailyHours.notte}N`;
                    } else {
                         cella += `${dailyHours.notte}N`;
                    }
                }
                
                dailyHours.causali.forEach((ore, sigla) => {
                     cella += `${cella ? ' ' : ''}${ore}${sigla}`;
                });

                if(cella) tecnicoRow[giorno] = cella.trim();
            }
            if(Object.keys(tecnicoRow).length > 0) reportData[tecnico.id] = tecnicoRow;
        }

        if (Object.keys(reportData).length > 0) {
            reportFinale[nave.id] = {
                naveNome: nave.nome,
                reportData,
                tecnici: selectedTecnici.filter(t => tecniciInNave.has(t.id))
            };
        }
    }

    return reportFinale;
};