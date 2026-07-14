import React, { useState, useMemo, useEffect } from 'react';
import { Paper, Typography, Box, Button, TextField, Autocomplete, CircularProgress, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/it';
import { useAlert } from '@/contexts/AlertContext';
import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Tecnico, Nave, TipoGiornata, Rapportino } from '@/models/definitions';

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
dayjs.locale('it');

// --- INTERFACCE --- 
interface DisplayRow {
    id: string;
    data: string;
    oreTotali: number;
    oreOrdinarie: number;
    oreStraordinarie: number;
    notte: number;
    [key: string]: any;
}
interface RiepilogoMese {
    oreTotali: number;
    oreOrdinarie: number;
    oreStraordinarie: number;
    notte: number;
    altreCausali: { [key: string]: { nome: string, totale: number } };
}
interface ReportData {
    rows: DisplayRow[];
    summary: RiepilogoMese;
    cols: GridColDef[];
}

// --- HELPERS (FINALMENTE COMPLETI) --- 
const getCleanId = (id: any): string | undefined => (typeof id === 'string' && id) || (id?.id as string | undefined);

const normalizeDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date.toDate === 'function') return date.toDate();
    if (date.seconds) return new Date(date.seconds * 1000);
    const d = dayjs(date, 'DD/MM/YYYY', true);
    return d.isValid() ? d.toDate() : (dayjs(date).isValid() ? dayjs(date).toDate() : null);
};

const normalizeTime = (time: any): Dayjs | null => {
    if (!time) return null;
    if (dayjs.isDayjs(time)) return time;
    if (typeof time.toDate === 'function') return dayjs(time.toDate());
    if (time instanceof Date) return dayjs(time);
    if (typeof time === 'string') {
        let d = dayjs(time, 'HH:mm', true);
        if (d.isValid()) return d;
        d = dayjs(time);
        if (d.isValid()) return d;
    }
    if (time.seconds) return dayjs(new Date(time.seconds * 1000));
    return null;
};

const parseFloatWithComma = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const abbreviate = (name: string): string => {
    if (!name) return '';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('104')) return '104';
    if (lowerName.startsWith('ferie')) return 'Fer.';
    if (lowerName.startsWith('malattia')) return 'Mal.';
    if (lowerName.startsWith('festivit')) return 'Fes.';
    if (lowerName.startsWith('permesso')) return 'Per.';
    return name.substring(0, 4);
};

// --- LOGICA DI CALCOLO --- 
const calculateReportData = (
    selectedTecnico: Tecnico,
    selectedMonth: Dayjs,
    allRapportini: Rapportino[],
    allNavi: Nave[],
    allTipiGiornata: TipoGiornata[]
): ReportData => {
    const naviMap = new Map(allNavi.map(n => [n.id, n]));
    const tipiGiornataMap = new Map(allTipiGiornata.map(t => [t.id, t]));
    const startOfMonth = selectedMonth.startOf('month');
    const endOfMonth = selectedMonth.endOf('month');

    const rapportiniDelMese = allRapportini.filter(r => {
        const dataRapportino = normalizeDate(r.data);
        return dataRapportino && dayjs(dataRapportino).isBetween(startOfMonth, endOfMonth, 'day', '[]');
    });

    const aggregationMap = new Map<string, any>();
    const dynamicHourTypesInMonth = new Map<string, TipoGiornata>();

    for (const r of rapportiniDelMese) {
        let oreDelTecnico = 0;
        const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => getCleanId(d.tecnicoId) === selectedTecnico.id);
        oreDelTecnico = dettaglioTecnico ? parseFloatWithComma(dettaglioTecnico.ore) : (getCleanId(r.tecnicoId) === selectedTecnico.id ? parseFloatWithComma(r.oreLavoro) : 0);

        if (oreDelTecnico <= 0) continue;

        const dataRapportino = normalizeDate(r.data)!;
        const dayKey = dayjs(dataRapportino).format('YYYY-MM-DD');

        if (!aggregationMap.has(dayKey)) {
            aggregationMap.set(dayKey, { id: dayKey, data: dataRapportino, workableHours: 0, explicitStraordinario: 0, nightHours: 0 });
        }
        const aggregatedRow = aggregationMap.get(dayKey)!;

        const nave = r.naveId ? naviMap.get(getCleanId(r.naveId)) : undefined;
        
        const isCartourNightRule = !!(nave?.nome.toLowerCase().includes('cartour'));
        
        const tipoGiornataId = getCleanId(r.tipoGiornataId);
        const tipoGiornata = tipoGiornataId ? tipiGiornataMap.get(tipoGiornataId) : undefined;

        if (isCartourNightRule) {
            aggregatedRow.nightHours += oreDelTecnico;
        } else if (tipoGiornata?.nome.toLowerCase().includes('straordinar')) {
            aggregatedRow.explicitStraordinario += oreDelTecnico;
        } else if (!tipoGiornata || tipoGiornata?.nome.toLowerCase().includes('ordinar')) {
            aggregatedRow.workableHours += oreDelTecnico;
        } else if (tipoGiornata) {
            dynamicHourTypesInMonth.set(tipoGiornata.id, tipoGiornata);
            aggregatedRow[tipoGiornata.id] = (aggregatedRow[tipoGiornata.id] || 0) + oreDelTecnico;
        }
    }

    const displayRows: DisplayRow[] = [];
    for (const aggregatedRow of aggregationMap.values()) {
        const oreOrdinarie = Math.min(aggregatedRow.workableHours, 8);
        const splitStraordinario = Math.max(0, aggregatedRow.workableHours - 8);
        const oreStraordinarie = aggregatedRow.explicitStraordinario + splitStraordinario;

        let otherHoursTotal = 0;
        dynamicHourTypesInMonth.forEach(tipo => { otherHoursTotal += aggregatedRow[tipo.id] || 0; });

        const row: DisplayRow = {
            id: aggregatedRow.id,
            data: dayjs(aggregatedRow.data).format('DD/MM/YYYY'),
            oreOrdinarie,
            oreStraordinarie,
            notte: aggregatedRow.nightHours,
            oreTotali: oreOrdinarie + oreStraordinarie + aggregatedRow.nightHours + otherHoursTotal,
        };
        dynamicHourTypesInMonth.forEach(tipo => { row[tipo.id] = aggregatedRow[tipo.id] || 0; });
        displayRows.push(row);
    }

    displayRows.sort((a, b) => dayjs(a.data, 'DD/MM/YYYY').valueOf() - dayjs(b.data, 'DD/MM/YYYY').valueOf());

    const dynamicCols = Array.from(dynamicHourTypesInMonth.values()).map(tipo => ({
        field: tipo.id,
        headerName: abbreviate(tipo.nome),
        flex: 1, align: 'right', headerAlign: 'right', type: 'number'
    } as GridColDef));

    const summary: RiepilogoMese = { oreTotali: 0, oreOrdinarie: 0, oreStraordinarie: 0, notte: 0, altreCausali: {} };
    for (const row of displayRows) {
        summary.oreTotali += row.oreTotali || 0;
        summary.oreOrdinarie += row.oreOrdinarie || 0;
        summary.oreStraordinarie += row.oreStraordinarie || 0;
        summary.notte += row.notte || 0;
        dynamicHourTypesInMonth.forEach(tipo => {
            if (row[tipo.id] > 0) {
                if (!summary.altreCausali[tipo.id]) summary.altreCausali[tipo.id] = { nome: abbreviate(tipo.nome), totale: 0 };
                summary.altreCausali[tipo.id].totale += row[tipo.id];
            }
        });
    }

    return { rows: displayRows, summary, cols: dynamicCols };
};

// --- COMPONENTE REACT --- 
const ReportMensili: React.FC = () => {
    const allRapportini = useLiveQuery(() => db.rapportini.toArray());
    const allTecnici = useLiveQuery(() => db.tecnici.toArray());
    const allNavi = useLiveQuery(() => db.navi.toArray());
    const allTipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray());
    const masterDataLoading = !allRapportini || !allTecnici || !allNavi || !allTipiGiornata;

    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);

    const uniqueTecnici = useMemo(() => {
        if (!allTecnici) return [];
        return [...new Map(allTecnici.map(item => [item.id, item])).values()].sort((a, b) => (a.cognome + ' ' + a.nome).localeCompare(b.cognome + ' ' + b.nome));
    }, [allTecnici]);

    useEffect(() => { setReportData(null); }, [selectedTecnico, selectedMonth]);

    const handleGenerateReport = () => {
        if (!selectedTecnico || !allRapportini || !allNavi || !allTipiGiornata) return;
        setIsGenerating(true);
        setReportData(null);
        setTimeout(() => {
            try {
                const data = calculateReportData(selectedTecnico, selectedMonth, allRapportini, allNavi, allTipiGiornata);
                setReportData(data);
            } catch (error) {
                console.error("Errore durante la generazione del report:", error);
            } finally {
                setIsGenerating(false);
            }
        }, 50);
    };

    const baseColumns: GridColDef[] = [
        { field: 'data', headerName: 'Data', flex: 1.2, align: 'left', headerAlign: 'left' },
        { field: 'oreTotali', headerName: 'Ore T.', type: 'number', flex: 0.8, align: 'right', headerAlign: 'right' },
        { field: 'oreOrdinarie', headerName: 'Ore Ord.', type: 'number', flex: 0.8, align: 'right', headerAlign: 'right' },
        { field: 'oreStraordinarie', headerName: 'Ore Str.', type: 'number', flex: 0.8, align: 'right', headerAlign: 'right' },
        { field: 'notte', headerName: 'Notte', type: 'number', flex: 0.8, align: 'right', headerAlign: 'right' },
    ];

    const allColumns = [...baseColumns, ...(reportData?.cols || [])];
    const summary = reportData?.summary;
    const totalStraordinarioAndNotte = (summary?.oreStraordinarie || 0) + (summary?.notte || 0);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h5">Report Mensile Tecnico</Typography>
                <Paper sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                    <Autocomplete options={uniqueTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={selectedTecnico} onChange={(_, v) => setSelectedTecnico(v)} isOptionEqualToValue={(o, v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Seleziona Tecnico" />} sx={{ minWidth: 250, flexGrow: 1 }} loading={masterDataLoading} />
                    <DatePicker views={['month', 'year']} label="Mese Report" value={selectedMonth} onChange={(v) => { if (v) setSelectedMonth(v); }} />
                    <Button variant="contained" onClick={handleGenerateReport} disabled={!selectedTecnico || isGenerating} startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : null}>{isGenerating ? 'Generando...' : 'Genera Report'}</Button>
                </Paper>

                {isGenerating && <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>}

                {!isGenerating && reportData && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', mt: 2 }}>
                        {summary && (
                            <Paper elevation={3} sx={{ p: 2, flexShrink: 0 }}>
                                <Typography variant="h6" gutterBottom>Riepilogo per {selectedTecnico?.nome} {selectedTecnico?.cognome} - {selectedMonth.format('MMMM YYYY')}</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                    {summary.oreOrdinarie > 0 && <Chip label={`Ordinario: ${summary.oreOrdinarie.toLocaleString('it-IT')}`} color="success" variant="outlined" />}
                                    {totalStraordinarioAndNotte > 0 && <Chip label={`Straordinario: ${totalStraordinarioAndNotte.toLocaleString('it-IT')} (di cui ${summary.notte.toLocaleString('it-IT')} nott.)`} color="warning" variant="outlined" />}
                                    {summary.altreCausali && Object.values(summary.altreCausali).map(causale => (
                                        causale.totale > 0 ? <Chip key={causale.nome} label={`${causale.nome}: ${causale.totale.toLocaleString('it-IT')}`} variant="outlined" size="small" /> : null
                                    ))}
                                    <Box sx={{ width: '100%', mt: 1 }}><Typography variant="body1">Ore Totali Lavorate: <strong>{summary.oreTotali.toLocaleString('it-IT')}</strong></Typography></Box>
                                </Box>
                            </Paper>
                        )}

                        <Paper sx={{ width: '100%', mt: 2 }}>
                            <DataGrid
                                rows={reportData.rows}
                                columns={allColumns}
                                autoHeight
                                density="compact"
                                disableRowSelectionOnClick
                                hideFooterPagination
                                localeText={{ noRowsLabel: 'Nessun dato per il tecnico nel mese selezionato.' }}
                                getRowHeight={() => 'auto'}
                                sx={{ '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(224, 224, 224, 1)', py: 1 } }}
                            />
                        </Paper>
                    </Box>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default ReportMensili;
