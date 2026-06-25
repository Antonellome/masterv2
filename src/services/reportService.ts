import { EnrichedRapportino, RiepilogoMese, MasterData, Rapportino, TipoGiornata } from '@/models/definitions';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import dayjs from 'dayjs';

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
    if (!selectedTecnicoId) return { rapportiniArricchiti: [], riepilogoMese: null };

    const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
    const naviMap = new Map(masterData.navi.map(n => [n.id, n.nome]));
    const luoghiMap = new Map(masterData.luoghi.map(l => [l.id, l.nome]));
    const monthInterval = { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) };

    const rapportiniDelMese = rapportini
        .filter(r => {
            const rapportinoDate = new Date(r.data);
            return isWithinInterval(rapportinoDate, monthInterval) &&
                (r.tecnicoId === selectedTecnicoId || r.dettaglioOreTecnici?.some(d => d.tecnicoId === selectedTecnicoId));
        })
        .map(r => {
            const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === selectedTecnicoId);
            const oreEffettive = dettaglioTecnico ? dettaglioTecnico.ore : (r.tecnicoId === selectedTecnicoId ? r.oreLavoro : 0);
            const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);

            const ordinariaTipoId = masterData.tipiGiornata.find(t => isSameType(t, 'ordinaria'))?.id;
            const isVecchioReportTrasferta = tipoGiornata?.categoria?.trim().toLowerCase() === 'trasferta';
            const tipoGiornataDaUsareId = isVecchioReportTrasferta ? (ordinariaTipoId || r.tipoGiornataId) : r.tipoGiornataId;
            const trasfertaId = isVecchioReportTrasferta ? r.tipoGiornataId : r.trasfertaId;
            const tipoGiornataFinale = tipiGiornataMap.get(tipoGiornataDaUsareId);

            const tipoGiornataNome = tipoGiornataFinale?.nome?.toLowerCase();
            let naveNome = naviMap.get(r.naveId) || 'N/D';
            let luogoNome = luoghiMap.get(r.luogoId) || 'N/D';

            if (tipoGiornataNome === 'ferie' || tipoGiornataNome === 'permesso') {
                naveNome = '-';
                luogoNome = '-';
            }

            return {
                ...r,
                data: new Date(r.data),
                dataFormatted: dayjs(r.data).isValid() ? dayjs(r.data).format('DD/MM/YYYY') : 'Data non valida',
                tipoGiornata: tipoGiornataFinale,
                tipoGiornataNome: tipoGiornataFinale?.nome || 'N/D',
                naveNome: naveNome,
                luogoNome: luogoNome,
                oreGiorno: oreEffettive || 0,
                trasfertaId,
                tipoGiornataId: tipoGiornataDaUsareId,
                oreOrdinarie: 0,
                oreStraordinarie: 0,
            } as EnrichedRapportino;
        })
        .filter(r => r.oreGiorno > 0 || r.trasfertaId);

    const groupedByDay = rapportiniDelMese.reduce((acc, r) => {
        const dayKey = format(r.data, 'yyyy-MM-dd');
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(r);
        return acc;
    }, {} as Record<string, EnrichedRapportino[]>);

    const finalRapportini: EnrichedRapportino[] = [];

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

    // --- CALCOLO RIEPILOGO --- 
    const riepilogo: RiepilogoMese = {
        dettaglio: new Map(),
        oreOrdinarie: 0, oreStraordinarie: 0, oreTotali: 0,
        giorniTotaliLavorati: 0, giorniTrasferta: 0,
        costoTotale: 0,
    };

    let summaryOrdinarie = 0;
    let summaryStraordinarie = 0;

    finalRapportini.forEach(r => {
        summaryStraordinarie += r.oreStraordinarie;
        if (isSameType(r.tipoGiornata, 'ordinaria')) {
             summaryOrdinarie += r.oreOrdinarie;
        }
    });

    riepilogo.oreOrdinarie = summaryOrdinarie;
    riepilogo.oreStraordinarie = summaryStraordinarie;
    riepilogo.oreTotali = summaryOrdinarie + summaryStraordinarie;

    const giorniLavoratiUnici = new Set<string>();
    finalRapportini.forEach(r => { if (r.oreGiorno > 0) giorniLavoratiUnici.add(format(r.data, 'yyyy-MM-dd')); });
    riepilogo.giorniTotaliLavorati = giorniLavoratiUnici.size;
    riepilogo.giorniTrasferta = finalRapportini.filter(r => r.trasfertaId).reduce((acc, r) => acc.add(format(r.data, 'yyyy-MM-dd')), new Set()).size;

    finalRapportini.sort((a, b) => a.data.getTime() - b.data.getTime());

    return { rapportiniArricchiti: finalRapportini, riepilogoMese: riepilogo };
}
