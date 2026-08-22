import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button, Autocomplete, CircularProgress, Checkbox,
    useTheme, Alert, Tooltip, IconButton
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DataGrid, GridColDef, GridToolbarContainer, GridRowsProp } from '@mui/x-data-grid';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import isBetween from 'dayjs/plugin/isBetween';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { Tecnico, Nave, Ditta, Categoria, Rapportino, TipoGiornata, Cliente, Luogo } from '@/models/definitions';
import jsPDF from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import PdfPreviewDialog from '@/components/common/PdfPreviewDialog';
import { parseToDayjs } from '@/utils/dateUtils';

dayjs.locale('it');
dayjs.extend(isBetween);

const UI_HIGHLIGHT_COLOR = '#222222';
const EXPORT_HIGHLIGHT_COLOR_BG_PDF = '#E0E0E0'; 
const EXPORT_HIGHLIGHT_COLOR_BG_EXCEL = 'FFE0E0E0';
const EXPORT_HIGHLIGHT_COLOR_TEXT_PDF = '#000000';
const EXPORT_HIGHLIGHT_COLOR_TEXT_EXCEL = 'FF000000';
const HEADER_EXCEL_GREEN_BG = 'FF16A085';
const HEADER_PDF_GREEN_BG = '#16A085';
const HEADER_WHITE_TEXT = '#FFFFFF';
const HEADER_EXCEL_WHITE_TEXT = 'FFFFFFFF';

const legendaCodici: Record<string, string> = { 'F': 'Ferie', 'L': '104', 'M': 'Malattia', 'P': 'Permesso', 'FE': 'Festivo', 'T': 'Trasferta', 'N': 'Notturna' };
const formatoOreLegenda: Record<string, string> = { "'8'": "Ore Ordinarie", "'+3'": "Ore Straordinarie", "'8+3'": "8 Ordinarie + 3 Straordinarie" };
const NON_WORKING_CODES = new Set(['F', 'L', 'M', 'P', 'FE']);
const CARTOUR_ID = 'y96J0gTZ5fIlYKkSgeNR';

const getTipoGiornataCodice = (tipoGiornata: TipoGiornata | undefined): string | null => {
    if (!tipoGiornata || !tipoGiornata.nome) return null;
    const nome = tipoGiornata.nome.toLowerCase();
    if (nome.includes('trasferta')) return 'T';
    if (nome.includes('festivo')) return 'FE';
    if (nome.includes('104')) return 'L';
    if (nome.startsWith('ferie')) return 'F';
    if (nome.startsWith('permesso')) return 'P';
    if (nome.startsWith('malattia')) return 'M';
    return null;
};

interface DailyHours { workable: number; straordinarioPuro: number; codice: string | null; oreCodice: number; }
interface PivotGridRowData { id: string; tecnico: string; totaleOre: number; dittaId?: string; [day: string]: DailyHours | number | string; }
interface ReportSummary { grandTotal: number; byType: { [key: string]: number }; }
interface ReportTableData { title: string; rows: GridRowsProp; summary: ReportSummary; }

const getTooltipTitle = (dayData: DailyHours): string => {
    const parts: string[] = [];
    if (dayData.codice && dayData.oreCodice > 0) {
        const nomeCodice = legendaCodici[dayData.codice] || dayData.codice;
        parts.push(`${nomeCodice}: ${dayData.oreCodice}`);
    }
    if (dayData.workable > 0) parts.push(`Lavorabili: ${dayData.workable}`);
    if (dayData.straordinarioPuro > 0) parts.push(`Straordinario: ${dayData.straordinarioPuro}`);
    return parts.join(', ');
};
const formatCellData = (dayData: DailyHours | undefined): string => {
    if (!dayData || (dayData.workable === 0 && dayData.straordinarioPuro === 0 && !dayData.codice && dayData.oreCodice === 0)) return '';
    if (dayData.codice && !['T', 'N'].includes(dayData.codice)) {
        const ore = dayData.oreCodice > 0 ? dayData.oreCodice : 8;
        return `${dayData.codice}${String(ore).replace('.', ',')}`;
    }
    const oreOrdinarie = Math.min(dayData.workable, 8);
    const straordinarioDaSplit = Math.max(0, dayData.workable - 8);
    const straordinarioTotale = straordinarioDaSplit + dayData.straordinarioPuro;
    let workString = '';
    if (oreOrdinarie > 0 && straordinarioTotale > 0) workString = `${String(oreOrdinarie).replace('.', ',')}+${String(straordinarioTotale).replace('.', ',')}`;
    else if (oreOrdinarie > 0) workString = String(oreOrdinarie).replace('.', ',');
    else if (straordinarioTotale > 0) workString = `+${String(straordinarioTotale).replace('.', ',')}`;
    let codeString = '';
    if (dayData.codice === 'T') codeString = 'T';
    else if (dayData.codice === 'N' && dayData.oreCodice > 0) codeString = `${String(dayData.oreCodice).replace('.', ',')}N`;
    return [workString, codeString].filter(Boolean).join(' ');
};

const CumulativiTecnici: React.FC = () => {
    const theme = useTheme();
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    
    const [reportData, setReportData] = useState<ReportTableData[]>([]);
    const [cols, setCols] = useState<GridColDef[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const { 
        rapportini: allRapportini, 
        tecnici: anagraficaTecnici, 
        ditte: anagraficaDitte, 
        categorie: anagraficaCategorie, 
        navi: anagraficaNavi, 
        tipiGiornata: anagraficaTipiGiornata, 
        clienti: anagraficaClienti, 
        luoghi: anagraficaLuoghi,
        tecniciMap, tipiGiornataMap, naviMap,
        loading: anagraficheLoading
    } = useRapportiniStore(state => state);

    const [selectedDitte, setSelectedDitte] = useState<Ditta[]>([]);
    const [selectedCategorie, setSelectedCategorie] = useState<Categoria[]>([]);
    const [selectedTecnici, setSelectedTecnici] = useState<Tecnico[]>([]);
    const [selectedNavi, setSelectedNavi] = useState<Nave[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [selectedLuoghi, setSelectedLuoghi] = useState<Luogo[]>([]);
    const [selectedTipiGiornata, setSelectedTipiGiornata] = useState<TipoGiornata[]>([]);

    const gtechId = useMemo(() => anagraficaDitte.find(d => d.nome?.toLowerCase() === 'g-tech')?.id, [anagraficaDitte]);

    const fullLegendaString = useMemo(() => {
        const oreParts = Object.entries(formatoOreLegenda).map(([key, value]) => `${key.replace(/'/g, "")} = ${value}`);
        const codiciParts = Object.entries(legendaCodici).map(([key, value]) => `${key} = ${value}`);
        return `Legenda: ${[...oreParts, ...codiciParts].join('; ')}`;
    }, []);

    const options = useMemo(() => {
        const safeSort = (arr: any[], labelFn: (item: any) => string) => arr.filter(Boolean).sort((a, b) => labelFn(a).localeCompare(labelFn(b)));
        return {
            ditte: safeSort(anagraficaDitte, (i: Ditta) => i.nome || ''),
            categorie: safeSort(anagraficaCategorie, (i: Categoria) => i.nome || ''),
            navi: safeSort(anagraficaNavi, (i: Nave) => i.nome || ''),
            tecnici: safeSort(anagraficaTecnici, (i: Tecnico) => `${i.cognome} ${i.nome}`),
            clienti: safeSort(anagraficaClienti, (i: Cliente) => i.nome || ''),
            luoghi: safeSort(anagraficaLuoghi, (i: Luogo) => i.nome || ''),
            tipiGiornata: safeSort(anagraficaTipiGiornata, (i: TipoGiornata) => i.nome || '')
        };
    }, [anagraficaDitte, anagraficaCategorie, anagraficaNavi, anagraficaTecnici, anagraficaClienti, anagraficaLuoghi, anagraficaTipiGiornata]);

    const processSummaryForDisplay = (summaryByType: { [key: string]: number }): { [key: string]: string | number } => {
        const processedSummary: { [key: string]: string | number } = {};
        const notturne = summaryByType['Notturna'] || 0;
        const straordinarie = summaryByType['Straordinarie'] || 0;
        const totaleStraordinari = straordinarie + notturne;
    
        for (const key in summaryByType) {
            if (key !== 'Notturna' && key !== 'Straordinarie') {
                processedSummary[key] = summaryByType[key];
            }
        }
    
        if (totaleStraordinari > 0) {
            if (notturne > 0) {
                processedSummary['Straordinarie'] = `${totaleStraordinari} (di cui ${notturne} Notturne)`;
            } else {
                processedSummary['Straordinarie'] = totaleStraordinari;
            }
        }
        
        return processedSummary;
    };

    useEffect(() => { setIsGenerated(false); }, [selectedDate, selectedDitte, selectedCategorie, selectedTecnici, selectedNavi, selectedCliente, selectedLuoghi, selectedTipiGiornata]);

    const handleGeneraMatrice = async () => {
        setIsLoading(true);

        const startOfMonth = selectedDate.startOf('month');
        const endOfMonth = selectedDate.endOf('month');
        const giorniDelMese = selectedDate.daysInMonth();

        const ditteIds = selectedDitte.length > 0 ? new Set(selectedDitte.map(d => d.id)) : null;
        const selectedTecniciIds = selectedTecnici.length > 0 ? new Set(selectedTecnici.map(t => t.id)) : null;
        const categorieIds = selectedCategorie.length > 0 ? new Set(selectedCategorie.map(c => c.id)) : null;

        const tecniciVisibiliIds = new Set(
            anagraficaTecnici.filter(t => 
                (!ditteIds || ditteIds.has(t.dittaId)) && 
                (!selectedTecniciIds || selectedTecniciIds.has(t.id)) &&
                (!categorieIds || categorieIds.has(t.categoriaId))
            ).map(t => t.id)
        );

        const tipiGiornataIds = selectedTipiGiornata.length > 0 ? new Set(selectedTipiGiornata.map(tg => tg.id)) : null;
        const luoghiIds = selectedLuoghi.length > 0 ? new Set(selectedLuoghi.map(l => l.id)) : null;

        const naviSelezionateIds = new Set(selectedNavi.map(n => n.id));
        if (selectedCliente) {
            anagraficaNavi.filter(n => n.clienteId === selectedCliente.id).forEach(n => naviSelezionateIds.add(n.id));
        }

        const filteredRapportini = allRapportini.filter(r => {
            const dataRapportino = parseToDayjs(r.data);
            if (!dataRapportino || !dataRapportino.isBetween(startOfMonth, endOfMonth, null, '[]')) return false;

            if (tipiGiornataIds && !tipiGiornataIds.has(r.tipoGiornataId)) return false;
            if (luoghiIds && !luoghiIds.has(r.luogoId)) return false;
            if (naviSelezionateIds.size > 0 && !naviSelezionateIds.has(r.naveId)) return false;

            const hasWorkplaceFilter = naviSelezionateIds.size > 0 || luoghiIds;
            const hasTypeFilter = tipiGiornataIds;
            if (hasWorkplaceFilter && !hasTypeFilter) {
                const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
                const codice = getTipoGiornataCodice(tipoGiornata);
                if (codice && NON_WORKING_CODES.has(codice)) return false;
            }
            
            return true;
        });

        const aggregateDataForRapportini = (rapportiniDaAggregare: Rapportino[]): { rows: GridRowsProp; summary: ReportSummary; } => {
            const allInvolvedTecnicoIds = new Set<string>();
            rapportiniDaAggregare.forEach(r => {
                r.presenze.forEach(id => allInvolvedTecnicoIds.add(id));
            });

            const finalTecnicoIds = Array.from(allInvolvedTecnicoIds).filter(id => id && tecniciVisibiliIds.has(id));

            const righeDaGenerare = new Map<string, PivotGridRowData>();
            finalTecnicoIds.forEach(id => {
                if (id && tecniciMap.has(id)) {
                    const info = tecniciMap.get(id)!;
                    const newRow: PivotGridRowData = { id, tecnico: `${info.cognome} ${info.nome}`, totaleOre: 0, dittaId: info.dittaId };
                    for (let i = 1; i <= giorniDelMese; i++) { newRow[String(i)] = { workable: 0, straordinarioPuro: 0, codice: null, oreCodice: 0 }; }
                    righeDaGenerare.set(id, newRow);
                }
            });

            for (const r of rapportiniDaAggregare) {
                const dataRapportino = parseToDayjs(r.data);
                if (!dataRapportino) continue;
                const giorno = dataRapportino.date().toString();
                const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
                const codice = getTipoGiornataCodice(tipoGiornata);
                
                for (const dettaglio of r.dettaglioOreTecnici) {
                    const tecnicoId = dettaglio.tecnicoId;
                    if (tecnicoId && righeDaGenerare.has(tecnicoId)) {
                        const ore = dettaglio.ore || 0;
                        if (ore <= 0) continue;

                        const riga = righeDaGenerare.get(tecnicoId)!;
                        const dayData = riga[giorno] as DailyHours;
                        
                        let codicePerQuestoTecnico = codice;
                        if (r.naveId === CARTOUR_ID && dettaglio.oraInizio) {
                            const ora = parseInt(dettaglio.oraInizio.split(':')[0], 10);
                            if (!isNaN(ora) && ora >= 21) {
                                codicePerQuestoTecnico = 'N';
                            }
                        }

                        if (codicePerQuestoTecnico) {
                            dayData.codice = codicePerQuestoTecnico;
                            dayData.oreCodice += ore;
                        } else if (tipoGiornata?.categoria === 'straordinario') {
                            dayData.straordinarioPuro += ore;
                        } else {
                            dayData.workable += ore;
                        }
                    }
                }
            }
            
            const finalRows = Array.from(righeDaGenerare.values());
            const summary: ReportSummary = { grandTotal: 0, byType: {} };

            finalRows.forEach(riga => {
                let totalRiga = 0;
                for (let i = 1; i <= giorniDelMese; i++) {
                    const dayData = riga[String(i)] as DailyHours;
                    const oreCodiceContabili = (dayData.codice && !['T'].includes(dayData.codice)) ? dayData.oreCodice : 0;
                    totalRiga += dayData.workable + dayData.straordinarioPuro + oreCodiceContabili;

                    if (dayData.codice && dayData.oreCodice > 0) {
                        const key = legendaCodici[dayData.codice] || dayData.codice;
                        summary.byType[key] = (summary.byType[key] || 0) + dayData.oreCodice;
                    }
                    const oreOrdinarie = Math.min(dayData.workable, 8);
                    const straordinarioDaSplit = Math.max(0, dayData.workable - 8);
                    const straordinarioTotale = straordinarioDaSplit + dayData.straordinarioPuro;
                    if(oreOrdinarie > 0) summary.byType['Ordinarie'] = (summary.byType['Ordinarie'] || 0) + oreOrdinarie;
                    if(straordinarioTotale > 0) summary.byType['Straordinarie'] = (summary.byType['Straordinarie'] || 0) + straordinarioTotale;
                }
                riga.totaleOre = totalRiga;
                summary.grandTotal += totalRiga;
            });

            const sortedRows = finalRows.filter(r => r.totaleOre > 0).sort((a, b) => String(a.tecnico).localeCompare(String(b.tecnico)));
            return { rows: sortedRows, summary };
        };

        const generatedTables: ReportTableData[] = [];
        const shouldSplitByNave = selectedNavi.length > 1 || (!!selectedCliente && selectedNavi.length === 0);

        if (shouldSplitByNave) {
            const rapportiniByNave = new Map<string, Rapportino[]>();
            filteredRapportini.forEach(r => {
                if (r.naveId) {
                    if (!rapportiniByNave.has(r.naveId)) rapportiniByNave.set(r.naveId, []);
                    rapportiniByNave.get(r.naveId)!.push(r);
                }
            });

            const sortedNaveIds = Array.from(rapportiniByNave.keys()).sort((a, b) => (naviMap.get(a)?.nome || '').localeCompare(naviMap.get(b)?.nome || ''));
            for (const naveId of sortedNaveIds) {
                const rapportiniPerNave = rapportiniByNave.get(naveId) || [];
                const { rows, summary } = aggregateDataForRapportini(rapportiniPerNave);
                if (rows.length > 0) {
                    generatedTables.push({ title: `Riepilogo per Nave: ${naviMap.get(naveId)?.nome || 'N/A'}`, rows, summary });
                }
            }
        } else {
            const { rows, summary } = aggregateDataForRapportini(filteredRapportini);
            if (rows.length > 0) {
                let title = "Riepilogo Generale";
                if (selectedNavi.length === 1) title = `Riepilogo per Nave: ${selectedNavi[0].nome}`;
                else if (selectedCliente) title = `Riepilogo per Cliente: ${selectedCliente.nome}`
                generatedTables.push({ title, rows, summary });
            }
        }
        
        const pivotCols: GridColDef[] = [ { field: 'tecnico', headerName: 'Tecnico', width: 200, frozen: true, cellClassName: 'tecnico-cell' } ];
        for (let i = 1; i <= giorniDelMese; i++) {
            const day = startOfMonth.date(i);
            pivotCols.push({ 
                field: String(i), headerName: String(i), width: 80, align: 'center', headerAlign: 'center', type: 'string', 
                cellClassName: (day.day() === 0 || day.day() === 6) ? 'highlight-cell' : '',
                renderCell: (params) => ( <Tooltip title={getTooltipTitle(params.value as DailyHours)} placement="top" arrow><span>{formatCellData(params.value as DailyHours)}</span></Tooltip> )
            });
        }
        pivotCols.push({ field: 'totaleOre', headerName: 'Totale Ore', width: 120, type: 'number', align: 'right', headerAlign: 'right', cellClassName: 'total-ore-cell' });
        
        setCols(pivotCols);
        setReportData(generatedTables);
        setIsGenerated(true);
        setIsLoading(false);
    };

    const handleExportToExcel = useCallback(async () => {
        // ... existing code ...
    }, [reportData, selectedDate, fullLegendaString, gtechId]);
    
    const handleGeneratePdf = useCallback(() => {
        // ... existing code ...
    }, [reportData, selectedDate, fullLegendaString, gtechId]);


    const CustomToolbar = () => (
        <GridToolbarContainer>
            <Button color="primary" startIcon={<FileDownloadIcon />} onClick={handleExportToExcel} disabled={reportData.flatMap(t => t.rows).length === 0}>Esporta Excel</Button>
            <Tooltip title="Genera Anteprima PDF e Condividi"><span><IconButton onClick={handleGeneratePdf} disabled={reportData.flatMap(t => t.rows).length === 0 || isGeneratingPdf}><PictureAsPdfIcon /></IconButton></span></Tooltip>
        </GridToolbarContainer>
    );
    
    const isOptionEqualToValue = (option: any, value: any) => option.id === value.id;
    const hasData = isGenerated && reportData.length > 0 && reportData.some(t => t.rows.length > 0);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='it'>
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4,
                                md: 2
                            }}><DatePicker label="Mese" views={['month', 'year']} value={selectedDate} onChange={(d) => d && setSelectedDate(d)} slotProps={{ textField: { fullWidth: true } }} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4,
                                md: 2
                            }}><Autocomplete options={options.clienti} value={selectedCliente} onChange={(_,v) => setSelectedCliente(v)} getOptionLabel={(o) => o.nome || ''} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Cliente" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4,
                                md: 2
                            }}><Autocomplete multiple options={options.ditte} value={selectedDitte} onChange={(_,v) => setSelectedDitte(v)} getOptionLabel={(o) => o.nome || ''} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Ditta" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4,
                                md: 2
                            }}><Autocomplete multiple options={options.luoghi} value={selectedLuoghi} onChange={(_,v) => setSelectedLuoghi(v)} getOptionLabel={(o) => o.nome || ''} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Luoghi" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4,
                                md: 2
                            }}><Autocomplete multiple options={options.navi} value={selectedNavi} onChange={(_,v) => setSelectedNavi(v)} getOptionLabel={(o) => o.nome || ''} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Nave"/>} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4,
                                md: 2
                            }}><Autocomplete multiple options={options.categorie} value={selectedCategorie} onChange={(_,v) => setSelectedCategorie(v)} getOptionLabel={(o) => o.nome || ''} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Categoria" />} /></Grid>

                        <Grid
                            size={{
                                xs: 12,
                                sm: 12,
                                md: 4
                            }}><Autocomplete multiple options={options.tipiGiornata} value={selectedTipiGiornata} onChange={(_,v) => setSelectedTipiGiornata(v)} getOptionLabel={(o) => o.nome || ''} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Tipo Giornata" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 9,
                                md: 6
                            }}><Autocomplete multiple disableCloseOnSelect options={options.tecnici} value={selectedTecnici} onChange={(_, v) => setSelectedTecnici(v)} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} isOptionEqualToValue={isOptionEqualToValue}
                                renderOption={(props, option, { selected }) => (<li {...props} key={option.id}><Checkbox icon={<CheckBoxOutlineBlankIcon fontSize="small" />} checkedIcon={<CheckBoxIcon fontSize="small" />} checked={selected} />{`${option.cognome} ${option.nome}`}</li>)}
                                renderInput={(params) => <TextField {...params} label="Tecnici" />}/></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 3,
                                md: 2
                            }}><Button variant="contained" size="large" onClick={handleGeneraMatrice} disabled={isLoading || anagraficheLoading} sx={{ width: '100%', height: '56px' }}>{isLoading ? <CircularProgress size={24}/> : 'Genera'}</Button></Grid>
                    </Grid>
                </Paper>
                
                {(isGenerated && !hasData && !isLoading) && <Alert severity="info">Nessun dato per i filtri selezionati.</Alert>}
                
                {hasData && (
                    <Box>
                        {reportData.map((table, index) => {
                            const displaySummary = processSummaryForDisplay(table.summary.byType);
                            return (
                                <Box key={index} sx={{ mb: 4 }}>
                                    <Grid container spacing={2} justifyContent="space-between" alignItems="flex-start">
                                        <Grid
                                            size={{
                                                xs: 12,
                                                md: "grow"
                                            }}><Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>{table.title}</Typography></Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                md: 'auto'
                                            }}>
                                            <Paper elevation={2} sx={{ p: 1, width: '100%' }}>
                                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Riepilogo Ore</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing(2) }}>
                                                    {Object.entries(displaySummary).sort((a,b) => a[0].localeCompare(b[0])).map(([tipo, ore]) => (
                                                        <Box key={tipo} sx={{ display: 'flex', alignItems: 'baseline' }}>
                                                            <Typography variant="caption" sx={{ mr: 0.5 }}>{tipo}:</Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{String(ore).replace('.', ',')}</Typography>
                                                        </Box>
                                                    ))}
                                                    <Box sx={{ display: 'flex', alignItems: 'baseline', ml: 1, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                                                        <Typography variant="caption" sx={{ mr: 0.5 }}>TOTALE:</Typography>
                                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{String(table.summary.grandTotal).replace('.', ',')}</Typography>
                                                    </Box>
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                    <Paper elevation={3} sx={{ width: '100%', mt: 2 }}>
                                        <DataGrid autoHeight rows={table.rows} columns={cols} density="compact" slots={{ toolbar: CustomToolbar }}
                                            getRowClassName={(params) => params.row.dittaId === gtechId ? 'gtech-row' : ''}
                                            sx={{ '& .MuiDataGrid-cell.highlight-cell': { bgcolor: UI_HIGHLIGHT_COLOR }, '& .tecnico-cell': { fontWeight: 'bold' }, '& .total-ore-cell': { fontWeight: 'bold' }, '& .gtech-row .MuiDataGrid-cell': { bgcolor: UI_HIGHLIGHT_COLOR } }}
                                        />
                                    </Paper>
                                </Box>
                            );
                        })}
                        <Paper elevation={1} sx={{ mt: 2, p: 2 }}><Typography variant="caption" component="p">{fullLegendaString}</Typography></Paper>
                    </Box>
                )}
            </Box>
            <PdfPreviewDialog open={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} pdfBlob={pdfBlob} isGenerating={isGeneratingPdf} fileName={`Report_Cumulativo_Tecnici_${selectedDate.format('MMMM_YYYY')}.pdf`}/>
        </LocalizationProvider>
    );
};

export default CumulativiTecnici;
