
import { EnrichedRapportino, RiepilogoMese, MasterData, Rapportino, Impostazioni, TipoGiornata } from '@/models/definitions';
import { format } from 'date-fns';
import dayjs from 'dayjs';

const normalizeDate = (date: any): Date => {
    if (!date) return new Date('invalid');
    if (date && typeof date.seconds === 'number') return new Date(date.seconds * 1000);
    if (typeof date.toDate === 'function') return date.toDate();
    const parsedDate = dayjs(date);
    return parsedDate.isValid() ? parsedDate.toDate() : new Date('invalid');
};

const getCleanId = (id: any): string | undefined => {
    if (typeof id === 'string' && id) return id;
    if (id && typeof id === 'object' && id.id && typeof id.id === 'string') return id.id;
    return undefined;
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

    // PRIMO FILTRO: Prende solo i rapportini del mese giusto per il tecnico giusto.
    const monthlyTecnicoRapportini = rapportini.filter(r => {
        const dataRapportino = normalizeDate(r.dataInizio || r.data);
        if (!dayjs(dataRapportino).isValid()) return false;
        
        const rapportinoDayjs = dayjs(dataRapportino);
        const isSameMonthAndYear = rapportinoDayjs.year() === selectedDayjs.year() && rapportinoDayjs.month() === selectedDayjs.month();
        if (!isSameMonthAndYear) return false;

        const mainTecnicoId = getCleanId(r.tecnicoId);
        const allTecnicoIdsInPresenze = (Array.isArray(r.dettaglioOre) ? r.dettaglioOre.map(d => getCleanId(d.tecnicoId)) : []).filter(Boolean) as string[];
        const allInvolvedTecnicos = [...new Set([mainTecnicoId, ...allTecnicoIdsInPresenze])];
        
        return allInvolvedTecnicos.includes(selectedTecnicoId);
    });

    // SECONDO PASSO: Arricchisce i rapportini filtrati con le ore corrette per il tecnico selezionato.
    // NESSUN FILTRO VIENE PIU' APPLICATO. Se un tecnico è presente con 0 ore, il report viene incluso.
    const enrichedRapportini: EnrichedRapportino[] = monthlyTecnicoRapportini.map(r => {
        let oreEffettive = 0;
        const mainTecnicoId = getCleanId(r.tecnicoId);

        if (Array.isArray(r.dettaglioOre)) {
            const dettaglioTecnico = r.dettaglioOre.find(d => getCleanId(d.tecnicoId) === selectedTecnicoId);
            if (dettaglioTecnico) {
                oreEffettive = dettaglioTecnico.ore || 0;
            }
        } else if (mainTecnicoId === selectedTecnicoId) {
            // Fallback per vecchi rapportini senza dettaglio ore
            oreEffettive = r.oreLavoro || 0;
        }

        const tipoGiornata = tipiGiornataMap.get(getCleanId(r.tipoGiornataId));
        const isVecchioReportTrasferta = tipoGiornata?.categoria === 'trasferta';
        const tipoGiornataDaUsareId = isVecchioReportTrasferta ? 't_ordinaria' : getCleanId(r.tipoGiornataId);
        const trasfertaId = isVecchioReportTrasferta ? getCleanId(r.tipoGiornataId) : getCleanId(r.trasfertaId);

        return {
            id: r.id,
            data: normalizeDate(r.dataInizio || r.data),
            dataInizio: r.dataInizio || r.data, // Mantiene il formato originale per ogni evenienza
            naveId: getCleanId(r.naveId),
            luogoId: getCleanId(r.luogoId),
            oreGiorno: oreEffettive, // Mostra le ore del tecnico, anche se 0.
            trasfertaId,
            tipoGiornataId: tipoGiornataDaUsareId,
            tipoGiornata: tipiGiornataMap.get(tipoGiornataDaUsareId),
            isEditable: mainTecnicoId === selectedTecnicoId,
            oreOrdinarie: 0,
            oreStraordinarie: 0,
            lavoroEseguito: r.lavoroEseguito
        };
    });

    // CALCOLO RIEPILOGO (invariato, usa `enrichedRapportini` completi)
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
        const dayKey = format(normalizeDate(r.data), 'yyyy-MM-dd');
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
                    if (report.oreGiorno > 0) voceRiepilogo.giorniSet?.add(dayKey);
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
    riepilogo.giorniTotaliLavorati = new Set(enrichedRapportini.filter(r => r.oreGiorno > 0).map(r => format(normalizeDate(r.data), 'yyyy-MM-dd'))).size;
    riepilogo.giorniTrasferta = new Set(enrichedRapportini.filter(r => r.trasfertaId).map(r => format(normalizeDate(r.data), 'yyyy-MM-dd'))).size;

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
    if (voceOrdinaria) riepilogo.oreOrdinarie = voceOrdinaria.oreTotali;
    if (voceStraordinaria) riepilogo.oreStraordinarie = voceStraordinaria.oreTotali;
    
    const finalRapportini = [...enrichedRapportini].sort((a, b) => (normalizeDate(a.data)?.getTime() || 0) - (normalizeDate(b.data)?.getTime() || 0));

    return { rapportiniArricchiti: finalRapportini, riepilogoMese: riepilogo };
}
