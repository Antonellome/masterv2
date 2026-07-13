
import { EnrichedRapportino, RiepilogoMese, MasterData, Rapportino, Impostazioni, TipoGiornata } from '@/models/definitions';
import { format } from 'date-fns';
import dayjs from 'dayjs';

const normalizeDate = (date: any): Date => {
    if (!date) return new Date('invalid');
    if (date && typeof date.seconds === 'number') { return new Date(date.seconds * 1000); } 
    if (typeof date.toDate === 'function') { return date.toDate(); }
    const parsedDate = dayjs(date);
    return parsedDate.isValid() ? parsedDate.toDate() : new Date('invalid');
};

const getCleanId = (id: any): string | undefined => {
    if (typeof id === 'string' && id) return id;
    if (id && typeof id === 'object' && id.id && typeof id.id === 'string') return id.id;
    return undefined;
};

const isSameType = (tipoGiornata: TipoGiornata | undefined, name: 'ordinaria' | 'straordinario') => {
    if (!tipoGiornata?.nome) return false;
    return tipoGiornata.nome.trim().toLowerCase() === name;
};

export function calculateMonthlyReportData(
    rapportini: Rapportino[] = [],
    masterData: MasterData,
    selectedTecnicoId: string,
    selectedMonth: Date
): { rapportiniArricchiti: EnrichedRapportino[], riepilogoMese: RiepilogoMese | null } {
    if (!selectedTecnicoId || !masterData.impostazioni) return { rapportiniArricchiti: [], riepilogoMese: null };

    const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
    const tariffeMap = new Map((masterData.impostazioni as Impostazioni).tariffe.map(t => [t.tipoGiornataId, t]));

    const selectedDayjs = dayjs(selectedMonth);
    const filteredAndNormalized = rapportini.map(r => ({
        ...r,
        data: normalizeDate(r.data),
        tecnicoId: getCleanId(r.tecnicoId),
        dettaglioOreTecnici: r.dettaglioOreTecnici?.map(d => ({ ...d, tecnicoId: getCleanId(d.tecnicoId) })) || [],
        tipoGiornataId: getCleanId(r.tipoGiornataId),
        trasfertaId: getCleanId(r.trasfertaId),
    })).filter(r => {
        if (!dayjs(r.data).isValid()) return false; 

        const rapportinoDayjs = dayjs(r.data);
        const isSameMonthAndYear = rapportinoDayjs.year() === selectedDayjs.year() && rapportinoDayjs.month() === selectedDayjs.month();
        if (!isSameMonthAndYear) return false;

        const isCorrectTecnico = r.tecnicoId === selectedTecnicoId || r.dettaglioOreTecnici?.some(d => d.tecnicoId === selectedTecnicoId);
        return isCorrectTecnico;
    });

    const enrichedRapportini: EnrichedRapportino[] = filteredAndNormalized.map(r => {
        const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
        let oreEffettive = 0;

        const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === selectedTecnicoId);
        if (dettaglioTecnico) {
            oreEffettive = dettaglioTecnico.ore || 0;
        } else if (r.tecnicoId === selectedTecnicoId) {
            oreEffettive = r.oreLavoro || 0;
        }

        const isVecchioReportTrasferta = tipoGiornata?.categoria === 'trasferta';
        const tipoGiornataDaUsareId = isVecchioReportTrasferta ? 't_ordinaria' : r.tipoGiornataId;
        const trasfertaId = isVecchioReportTrasferta ? r.tipoGiornataId : r.trasfertaId;

        return {
            ...r,
            data: r.data,
            tipoGiornata: tipiGiornataMap.get(tipoGiornataDaUsareId),
            oreGiorno: oreEffettive,
            trasfertaId,
            tipoGiornataId: tipoGiornataDaUsareId,
            isEditable: r.tecnicoId === selectedTecnicoId,
            oreOrdinarie: 0,
            oreStraordinarie: 0
        };
    }).filter(r => r.oreGiorno > 0 || r.trasfertaId);

    const riepilogo: RiepilogoMese = {
        dettaglio: new Map(),
        oreTotali: 0, giorniTotaliLavorati: 0, giorniTrasferta: 0, costoTotale: 0,
        oreOrdinarie: 0, oreStraordinarie: 0,
    };

    masterData.tipiGiornata.forEach(tipo => {
        const tariffa = tariffeMap.get(tipo.id);
        riepilogo.dettaglio.set(tipo.id, { 
            id: tipo.id, nome: tipo.nome, colore: tipo.colore, 
            unita: tariffa?.unita || 'h', oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set()
        });
    });

    const groupedByDay = enrichedRapportini.reduce((acc, r) => {
        const dayKey = format(r.data, 'yyyy-MM-dd');
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(r);
        return acc;
    }, {} as Record<string, EnrichedRapportino[]>);

    const voceOrdinaria = riepilogo.dettaglio.get('t_ordinaria');
    const voceStraordinaria = riepilogo.dettaglio.get('t_straordinaria');

    for (const dayKey in groupedByDay) {
        const reports = groupedByDay[dayKey];
        let oreDaSplittareDelGiorno = 0;
        let trasfertaProcessedForDay = false;

        reports.forEach(report => {
            if (report.tipoGiornataId === 't_ordinaria') {
                oreDaSplittareDelGiorno += report.oreGiorno;
            } else {
                const voceRiepilogo = riepilogo.dettaglio.get(report.tipoGiornataId);
                if (voceRiepilogo) {
                    voceRiepilogo.oreTotali += report.oreGiorno;
                    voceRiepilogo.giorniSet?.add(dayKey);
                }
            }
            if (report.trasfertaId && !trasfertaProcessedForDay) {
                const voceTrasferta = riepilogo.dettaglio.get(report.trasfertaId);
                if (voceTrasferta) {
                    voceTrasferta.giorniSet?.add(dayKey);
                    trasfertaProcessedForDay = true;
                }
            }
        });

        if (oreDaSplittareDelGiorno > 0 && voceOrdinaria) {
            voceOrdinaria.giorniSet?.add(dayKey);
        }

        const dailyOrdinarie = Math.min(oreDaSplittareDelGiorno, 8);
        const dailyStraordinarie = Math.max(0, oreDaSplittareDelGiorno - 8);

        if (voceOrdinaria) voceOrdinaria.oreTotali += dailyOrdinarie;
        if (voceStraordinaria) {
            voceStraordinaria.oreTotali += dailyStraordinarie;
            if (dailyStraordinarie > 0) voceStraordinaria.giorniSet?.add(dayKey);
        }
    }

    riepilogo.oreTotali = enrichedRapportini.reduce((sum, r) => sum + r.oreGiorno, 0);

    riepilogo.giorniTrasferta = new Set(enrichedRapportini.filter(r => r.trasfertaId).map(r => format(r.data, 'yyyy-MM-dd'))).size;

    let costoTotaleFinale = 0;
    for (const voce of riepilogo.dettaglio.values()) {
        voce.giorni = voce.giorniSet?.size || 0;
        delete voce.giorniSet;
        const tariffa = tariffeMap.get(voce.id);
        if (tariffa && tariffa.costo > 0) {
            voce.costo = (tariffa.unita === 'g') ? (voce.giorni * tariffa.costo) : (voce.oreTotali * tariffa.costo);
            costoTotaleFinale += voce.costo;
        }
    }

    riepilogo.costoTotale = costoTotaleFinale;
    riepilogo.giorniTotaliLavorati = Object.keys(groupedByDay).length;
    if (voceOrdinaria) riepilogo.oreOrdinarie = voceOrdinaria.oreTotali;
    if (voceStraordinaria) riepilogo.oreStraordinarie = voceStraordinaria.oreTotali;

    const finalRapportini: (EnrichedRapportino | null)[] = []; 
    for (const dayKey in groupedByDay) {
        const reports = groupedByDay[dayKey];
        const totalOreOrdinarieDelGiorno = reports
            .filter(r => isSameType(r.tipoGiornata, 'ordinaria'))
            .reduce((sum, r) => sum + r.oreGiorno, 0);

        let oreOrdinarieRimanentiPerSplit = Math.min(totalOreOrdinarieDelGiorno, 8);

        reports.forEach(report => {
            const newReport = { ...report };
            if (isSameType(report.tipoGiornata, 'ordinaria')) {
                const oreDaAssegnare = Math.min(report.oreGiorno, oreOrdinarieRimanentiPerSplit);
                newReport.oreOrdinarie = oreDaAssegnare;
                newReport.oreStraordinarie = report.oreGiorno - oreDaAssegnare;
                oreOrdinarieRimanentiPerSplit -= oreDaAssegnare;
            } else if (isSameType(report.tipoGiornata, 'straordinario')) {
                newReport.oreStraordinarie = report.oreGiorno;
                newReport.oreOrdinarie = 0;
            } else {
                newReport.oreOrdinarie = report.oreGiorno;
                newReport.oreStraordinarie = 0;
            }
            finalRapportini.push(newReport);
        });
    }

    // Filtra gli elementi nulli o undefined e ordina in modo sicuro
    const cleanRapportini = finalRapportini
        .filter((r): r is EnrichedRapportino => !!r)
        .sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0));

    return { rapportiniArricchiti: cleanRapportini, riepilogoMese: riepilogo };
}
