import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
    Rapportino, Tecnico, Nave, TipoGiornata
} from '@/models/definitions';

dayjs.extend(isBetween);

// --- INTERFACCE E TIPI (INVARIATI) ---
export interface CellaMatrice {
    valore: string;
    tooltip: string;
}
export interface RigaMatrice {
    tecnico: Tecnico;
    giorni: { [giorno: number]: CellaMatrice };
}
export interface BloccoNaveData {
    naveNome: string;
    righe: RigaMatrice[];
    giorniDelMese: number[];
}
export interface MatriceData {
    [naveId: string]: BloccoNaveData;
}

// --- ARGOMENTI PER LA FUNZIONE DI ELABORAZIONE ---
interface ProcessProps {
    selectedDate: Dayjs | null;
    selectedTecnici: Tecnico[];
    selectedNavi: Nave[];
    tecniciFiltratiUI: Tecnico[];
    allRapportini: Rapportino[];
    allTecnici: Tecnico[];
    allNavi: Nave[];
    allTipiGiornata: TipoGiornata[];
}

// --- FUNZIONI HELPER (PRIVATE DEL MODULO) ---
const getCleanId = (id: any): string => (typeof id === 'string' ? id : id?.id) || '';
const parseFloatWithComma = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};
const normalizeDate = (date: any): Dayjs | null => {
    if (!date) return null;
    const d = dayjs(date);
    return d.isValid() ? d : null;
};
const normalizeTime = (time: any): Dayjs | null => {
    if (!time) return null;
    if (time.seconds) return dayjs(new Date(time.seconds * 1000));
    const t = dayjs(time);
    return t.isValid() ? t : null;
};

// --- LA FUNZIONE DI ELABORAZIONE: PURA E SENZA STATO ---
export const processaMatrice = (props: ProcessProps): MatriceData => {
    const {
        selectedDate, selectedTecnici, selectedNavi, tecniciFiltratiUI,
        allRapportini, allTecnici, allNavi, allTipiGiornata
    } = props;

    if (!selectedDate || !allRapportini.length || !allTecnici.length) {
        return {};
    }

    // --- PRE-ELABORAZIONE E MAPPING PER PERFORMANCE ---
    const naviMap = new Map(allNavi.map(n => [n.id, n]));
    const tipiGiornataMap = new Map(allTipiGiornata.map(t => [t.id, t]));
    const tecniciMap = new Map(allTecnici.map(t => [t.id, t]));
    const cartourDeltaId = allNavi.find(n => n.nome?.toLowerCase().includes('cartour delta'))?.id;

    // 1. FILTRA RAPPORTINI PER MESE
    const startOfMonth = selectedDate.startOf('month');
    const endOfMonth = selectedDate.endOf('month');
    const rapportiniDelMese = allRapportini.filter(r => {
        const dataRapportino = normalizeDate(r.data);
        return dataRapportino?.isBetween(startOfMonth, endOfMonth, 'day', '[]') ?? false;
    });

    if (rapportiniDelMese.length === 0) return {};

    const giorniNelMeseArr = Array.from({ length: selectedDate.daysInMonth() }, (_, i) => i + 1);
    const datiFinali: MatriceData = {};
    const naviDaIterare = selectedNavi.length > 0 ? selectedNavi : [{ id: 'aggregated', nome: 'Riepilogo Aggregato' } as Nave];
    
    const tipiAssenza = new Set(['ferie', 'malattia', 'permesso', 'legge 104']);

    // --- FUNZIONE INTERNA PER CALCOLARE LA SINGOLA CELLA ---
    const calcolaCella = (rapportiniGiorno: Rapportino[], tecnico: Tecnico): CellaMatrice => {
        let oreOrdinarie = 0, oreStraordinarie = 0, oreNotturne = 0;
        let tooltipLines: string[] = [];

        const assenza = rapportiniGiorno.find(r => {
            const tipo = tipiGiornataMap.get(getCleanId(r.tipoGiornataId));
            return tipo?.nome && tipiAssenza.has(tipo.nome.toLowerCase());
        });

        if (assenza) {
            const tipo = tipiGiornataMap.get(getCleanId(assenza.tipoGiornataId));
            const nomeTipo = tipo?.nome || 'Assenza';
            return { valore: nomeTipo.charAt(0).toUpperCase(), tooltip: nomeTipo };
        }

        for (const r of rapportiniGiorno) {
            let oreDelTecnico = 0;
            if (r.dettaglioOreTecnici?.length) {
                const dett = r.dettaglioOreTecnici.find(d => getCleanId(d.tecnicoId) === tecnico.id);
                oreDelTecnico = dett ? parseFloatWithComma(dett.ore) : 0;
            } else if (getCleanId(r.tecnicoId) === tecnico.id) {
                oreDelTecnico = parseFloatWithComma(r.oreLavoro);
            }
            if (oreDelTecnico === 0) continue;

            const orarioInizio = normalizeTime(r.orarioInizio);
            const isNotturno = !!(cartourDeltaId && getCleanId(r.naveId) === cartourDeltaId && orarioInizio && orarioInizio.hour() >= 21);
            const tipoGiornata = tipiGiornataMap.get(getCleanId(r.tipoGiornataId));
            const isStraordinario = tipoGiornata?.nome?.toLowerCase().includes('straordinar') ?? false;

            if (isNotturno) oreNotturne += oreDelTecnico;
            else if (isStraordinario) oreStraordinarie += oreDelTecnico;
            else oreOrdinarie += oreDelTecnico;
            
            const naveNome = naviMap.get(getCleanId(r.naveId))?.nome || 'N/D';
            if (naviDaIterare[0].id === 'aggregated') tooltipLines.push(`${naveNome}: ${oreDelTecnico}h`);
        }
        
        if (oreOrdinarie > 8) {
            oreStraordinarie += oreOrdinarie - 8;
            oreOrdinarie = 8;
        }

        let valore = '';
        if (oreOrdinarie > 0) valore += oreOrdinarie;
        if (oreStraordinarie > 0) valore += `+${oreStraordinarie}`;
        if (oreNotturne > 0) valore += `${oreNotturne}N`;
        
        return { valore, tooltip: tooltipLines.length > 0 ? tooltipLines.join('; ') : valore || 'Nessuna attività' };
    };

    // --- CICLO PRINCIPALE DI ELABORAZIONE ---
    for (const nave of naviDaIterare) {
        const isAggregato = nave.id === 'aggregated';
        const rapportiniPerMatrice = isAggregato ? rapportiniDelMese : rapportiniDelMese.filter(r => getCleanId(r.naveId) === nave.id);

        const idTecniciConDati = new Set(rapportiniPerMatrice.flatMap(r => 
            r.dettaglioOreTecnici?.map(d => getCleanId(d.tecnicoId)) ?? [getCleanId(r.tecnicoId)]
        ).filter(id => !!id));

        let tecniciDaVisualizzare = Array.from(idTecniciConDati)
            .map(id => tecniciMap.get(id))
            .filter((t): t is Tecnico => !!t);

        if (selectedTecnici.length > 0) {
            const selectedIds = new Set(selectedTecnici.map(t => t.id));
            tecniciDaVisualizzare = tecniciDaVisualizzare.filter(t => selectedIds.has(t.id));
        } else if (tecniciFiltratiUI.length < allTecnici.length) {
             const filteredIds = new Set(tecniciFiltratiUI.map(t => t.id));
             tecniciDaVisualizzare = tecniciDaVisualizzare.filter(t => filteredIds.has(t.id));
        }
        
        tecniciDaVisualizzare.sort((a,b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`));

        const righe: RigaMatrice[] = [];
        for (const tecnico of tecniciDaVisualizzare) {
            const giorni: { [giorno: number]: CellaMatrice } = {};
            const rapportiniTecnico = rapportiniPerMatrice.filter(r => 
                getCleanId(r.tecnicoId) === tecnico.id || r.dettaglioOreTecnici?.some(d => getCleanId(d.tecnicoId) === tecnico.id)
            );

            for (const giorno of giorniNelMeseArr) {
                const rappGiorno = rapportiniTecnico.filter(r => normalizeDate(r.data)?.date() === giorno);
                if (rappGiorno.length > 0) {
                    giorni[giorno] = calcolaCella(rappGiorno, tecnico);
                }
            }
            if (Object.keys(giorni).length > 0) righe.push({ tecnico, giorni });
        }

        if (righe.length > 0) {
            datiFinali[nave.id] = {
                naveNome: nave.nome,
                righe,
                giorniDelMese: giorniNelMeseArr,
            };
        }
    }
    
    return datiFinali;
};