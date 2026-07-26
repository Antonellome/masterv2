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
import { db } from '@/db/db';
import { Tecnico, Nave, Ditta, Categoria, Rapportino, TipoGiornata, Cliente, Luogo } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import jsPDF from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import PdfPreviewDialog from '@/components/common/PdfPreviewDialog';

dayjs.locale('it');
dayjs.extend(isBetween);

// --- CONFIGURAZIONE STILI ---
const UI_HIGHLIGHT_COLOR = '#222222';
const EXPORT_HIGHLIGHT_COLOR_BG_PDF = '#E0E0E0'; 
const EXPORT_HIGHLIGHT_COLOR_BG_EXCEL = 'FFE0E0E0';
const EXPORT_HIGHLIGHT_COLOR_TEXT_PDF = '#000000';
const EXPORT_HIGHLIGHT_COLOR_TEXT_EXCEL = 'FF000000';
const HEADER_EXCEL_GREEN_BG = 'FF16A085';
const HEADER_PDF_GREEN_BG = '#16A085';
const HEADER_WHITE_TEXT = '#FFFFFF';
const HEADER_EXCEL_WHITE_TEXT = 'FFFFFFFF';

// --- LEGGENDE E COSTANTI ---
const legendaCodici: Record<string, string> = { 'F': 'Ferie', 'L': '104', 'M': 'Malattia', 'P': 'Permesso', 'FE': 'Festivo', 'T': 'Trasferta', 'N': 'Notturna' };
const formatoOreLegenda: Record<string, string> = { "'8'": "Ore Ordinarie", "'+3'": "Ore Straordinarie", "'8+3'": "8 Ordinarie + 3 Straordinarie" };
const NON_WORKING_CODES = new Set(['F', 'L', 'M', 'P', 'FE']);
const CARTOUR_ID = 'y96J0gTZ5fIlYKkSgeNR';

// --- FUNZIONI DI UTILITY ---
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
const getCleanId = (id: any): string | undefined => {
    if (typeof id === 'string' && id) return id;
    if (id && typeof id === 'object' && id.id && typeof id.id === 'string') return id.id;
    return undefined;
};
const normalizeDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date.toDate === 'function') return date.toDate();
    if (date.seconds) return new Date(date.seconds * 1000);
    const d = dayjs(date, 'DD/MM/YYYY', true);
    return d.isValid() ? d.toDate() : (dayjs(date).isValid() ? dayjs(date).toDate() : null);
};
const getTecnicoLabel = (option: any): string => (option && typeof option === 'object' && option.cognome && option.nome) ? `${option.cognome} ${option.nome}` : (typeof option === 'string' ? option : '');
const getGenericLabel = (option: any): string => (option && typeof option === 'object' && option.nome) ? option.nome : (typeof option === 'string' ? option : '');

// --- STRUTTURE DATI AMPLIATE ---
interface DailyHours { workable: number; straordinarioPuro: number; codice: string | null; oreCodice: number; }
interface PivotGridRowData { id: string; tecnico: string; totaleOre: number; dittaId?: string; [day: string]: DailyHours | number | string; }
interface ReportSummary { grandTotal: number; byType: { [key: string]: number }; }
interface ReportTableData { title: string; rows: GridRowsProp; summary: ReportSummary; }

// --- FUNZIONI DI FORMATTAZIONE ---
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

    const allAnagrafiche = useLiveQuery(() => Promise.all([ db.ditte.toArray(), db.categorie.toArray(), db.navi.toArray(), db.tecnici.toArray(), db.tipiGiornata.toArray(), db.clienti.toArray(), db.luoghi.toArray() ]), []);
    const [anagraficaDitte, anagraficaCategorie, anagraficaNavi, anagraficaTecnici, anagraficaTipiGiornata, anagraficaClienti, anagraficaLuoghi] = allAnagrafiche || [[], [], [], [], [], [], []];

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
            ditte: safeSort(anagraficaDitte.filter(i => i.nome), getGenericLabel),
            categorie: safeSort(anagraficaCategorie.filter(i => i.nome), getGenericLabel),
            navi: safeSort(anagraficaNavi.filter(i => i.nome), getGenericLabel),
            tecnici: safeSort(anagraficaTecnici.filter(i => i.nome && i.cognome), getTecnicoLabel),
            clienti: safeSort(anagraficaClienti.filter(i => i.nome), getGenericLabel),
            luoghi: safeSort(anagraficaLuoghi.filter(i => i.nome), getGenericLabel),
            tipiGiornata: safeSort(anagraficaTipiGiornata.filter(i => i.nome), getGenericLabel)
        };
    }, [allAnagrafiche]);

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
        if (!allAnagrafiche) return;
        setIsLoading(true);

        const startOfMonth = selectedDate.startOf('month');
        const endOfMonth = selectedDate.endOf('month');
        const giorniDelMese = selectedDate.daysInMonth();
        const tipiGiornataMap = new Map(anagraficaTipiGiornata.map(t => [getCleanId(t.id), t]));
        const tecniciMap = new Map(anagraficaTecnici.map(t => [getCleanId(t.id), t]));
        const naviMap = new Map(anagraficaNavi.map(n => [getCleanId(n.id), n.nome]));

        // --- FASE 1: Preparazione dei Set di ID per il filtraggio ---
        const ditteIds = selectedDitte.length > 0 ? new Set(selectedDitte.map(d => getCleanId(d.id))) : null;
        const selectedTecniciIds = selectedTecnici.length > 0 ? new Set(selectedTecnici.map(t => getCleanId(t.id))) : null;
        const categorieIds = selectedCategorie.length > 0 ? new Set(selectedCategorie.map(c => getCleanId(c.id))) : null;

        const tecniciVisibiliIds = new Set(
            anagraficaTecnici.filter(t => 
                (!ditteIds || ditteIds.has(getCleanId(t.dittaId))) && 
                (!selectedTecniciIds || selectedTecniciIds.has(getCleanId(t.id))) &&
                (!categorieIds || categorieIds.has(getCleanId((t as any).categoriaId)))
            ).map(t => getCleanId(t.id))
        );

        const tipiGiornataIds = selectedTipiGiornata.length > 0 ? new Set(selectedTipiGiornata.map(tg => getCleanId(tg.id))) : null;
        const luoghiIds = selectedLuoghi.length > 0 ? new Set(selectedLuoghi.map(l => getCleanId(l.id))) : null;

        const naviSelezionateIds = new Set(selectedNavi.map(n => getCleanId(n.id)));
        if (selectedCliente) {
            const clienteId = getCleanId(selectedCliente.id);
            anagraficaNavi.filter(n => getCleanId(n.clienteId) === clienteId).forEach(n => naviSelezionateIds.add(getCleanId(n.id)));
        }

        // --- FASE 2: Filtraggio Unificato dei Rapportini ---
        const allRapportini = await db.rapportini.toArray();
        const filteredRapportini = allRapportini.filter(r => {
            const dataRapportino = dayjs(normalizeDate((r as any).dataInizio || r.data));
            if (!dataRapportino.isValid() || !dataRapportino.isBetween(startOfMonth, endOfMonth, null, '[]')) return false;

            const tipoGiornataId = getCleanId(r.tipoGiornataId);

            if (tipiGiornataIds && !tipiGiornataIds.has(tipoGiornataId)) return false;
            if (luoghiIds && !luoghiIds.has(getCleanId(r.luogoId))) return false;
            if (naviSelezionateIds.size > 0 && !naviSelezionateIds.has(getCleanId(r.naveId))) return false;

            const hasWorkplaceFilter = naviSelezionateIds.size > 0 || luoghiIds;
            const hasTypeFilter = tipiGiornataIds;
            if (hasWorkplaceFilter && !hasTypeFilter) {
                const tipoGiornata = tipiGiornataMap.get(tipoGiornataId);
                const codice = getTipoGiornataCodice(tipoGiornata);
                if (codice && NON_WORKING_CODES.has(codice)) return false;
            }
            
            return true;
        });

        // --- FASE 3: Aggregazione dei dati per la visualizzazione ---
        const aggregateDataForRapportini = (rapportiniDaAggregare: Rapportino[]): { rows: GridRowsProp; summary: ReportSummary; } => {
            const allInvolvedTecnicoIds = new Set<string>();
            rapportiniDaAggregare.forEach(r => {
                const addId = (id: any) => { const cleanId = getCleanId(id); if (cleanId) allInvolvedTecnicoIds.add(cleanId); };
                addId(r.tecnicoId); (r.altriTecniciIds || []).forEach(addId); (r.presenze || []).forEach(addId); (r.dettaglioOreTecnici || []).forEach(d => addId(d.tecnicoId));
            });
            const finalTecnicoIds = Array.from(allInvolvedTecnicoIds).filter(id => id && tecniciVisibiliIds.has(id));

            const righeDaGenerare = new Map<string, PivotGridRowData>();
            finalTecnicoIds.forEach(id => {
                if (id && tecniciMap.has(id)) {
                    const info = tecniciMap.get(id)!;
                    const newRow: PivotGridRowData = { id, tecnico: `${info.cognome} ${info.nome}`, totaleOre: 0, dittaId: getCleanId(info.dittaId) };
                    for (let i = 1; i <= giorniDelMese; i++) { newRow[String(i)] = { workable: 0, straordinarioPuro: 0, codice: null, oreCodice: 0 }; }
                    righeDaGenerare.set(id, newRow);
                }
            });

            for (const r of rapportiniDaAggregare) {
                const dataRapportino = normalizeDate((r as any).dataInizio || r.data);
                if (!dataRapportino) continue;
                const giorno = dayjs(dataRapportino).date().toString();
                const tipoGiornata = tipiGiornataMap.get(getCleanId(r.tipoGiornataId));
                let codice = getTipoGiornataCodice(tipoGiornata);
                const isNotturnoSpeciale = getCleanId(r.naveId) === CARTOUR_ID && dayjs(dataRapportino).hour() >= 21;
                if (isNotturnoSpeciale) codice = 'N';
                const isStraordinarioNotturnoGenerico = !isNotturnoSpeciale && tipoGiornata?.nome.toLowerCase().includes('notturn');

                const processHoursForTecnico = (id: string, ore: number) => {
                    const cleanId = getCleanId(id);
                    if (cleanId && righeDaGenerare.has(cleanId)) {
                        const riga = righeDaGenerare.get(cleanId)!;
                        const dayData = riga[giorno] as DailyHours;
                        if (codice) { dayData.codice = codice; dayData.oreCodice += ore; }
                        else if (tipoGiornata?.nome.toLowerCase().includes('straordinar') || isStraordinarioNotturnoGenerico) { dayData.straordinarioPuro += ore; }
                        else { dayData.workable += ore; }
                    }
                };
                
                const isNewHybridModel = r.dettaglioOreTecnici && Array.isArray(r.dettaglioOreTecnici) && r.dettaglioOreTecnici.length > 0;
                if (isNewHybridModel) {
                    const techsWhoGotHours = new Set<string>();
                    r.dettaglioOreTecnici!.forEach(d => {
                        const cleanId = getCleanId(d.tecnicoId);
                        const oreNumeriche = d.ore ? parseFloat(String(d.ore).replace(',', '.')) : 0;
                        if (cleanId && oreNumeriche > 0) { processHoursForTecnico(cleanId, oreNumeriche); techsWhoGotHours.add(cleanId); }
                    });
                    const principaleId = getCleanId(r.tecnicoId);
                    if (principaleId && !techsWhoGotHours.has(principaleId)) {
                        const orePrincipale = r.oreLavoro ? parseFloat(String(r.oreLavoro).replace(',', '.')) : 0;
                        if (orePrincipale > 0) processHoursForTecnico(principaleId, orePrincipale);
                    }
                } else {
                    const monteOre = r.oreLavoro ? parseFloat(String(r.oreLavoro).replace(',', '.')) : 0;
                    if (monteOre > 0) {
                        const allLegacyTecnici = new Set<string>();
                        const addId = (id: any) => { const c = getCleanId(id); if(c) allLegacyTecnici.add(c) };
                        addId(r.tecnicoId); (r.altriTecniciIds || []).forEach(addId); (r.presenze || []).forEach(addId);
                        const numeroTecnici = allLegacyTecnici.size;
                        if (numeroTecnici > 0) { allLegacyTecnici.forEach(id => processHoursForTecnico(id, monteOre / numeroTecnici)); }
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

        // --- FASE 4: Generazione delle Tabelle per la UI ---
        const generatedTables: ReportTableData[] = [];
        const shouldSplitByNave = selectedNavi.length > 1 || (!!selectedCliente && selectedNavi.length === 0);

        if (shouldSplitByNave) {
            const rapportiniByNave = new Map<string, Rapportino[]>();
            filteredRapportini.forEach(r => {
                const naveId = getCleanId(r.naveId);
                if (naveId) {
                    if (!rapportiniByNave.has(naveId)) rapportiniByNave.set(naveId, []);
                    rapportiniByNave.get(naveId)!.push(r);
                }
            });

            const sortedNaveIds = Array.from(rapportiniByNave.keys()).sort((a, b) => (naviMap.get(a) || '').localeCompare(naviMap.get(b) || ''));
            for (const naveId of sortedNaveIds) {
                const rapportiniPerNave = rapportiniByNave.get(naveId) || [];
                const { rows, summary } = aggregateDataForRapportini(rapportiniPerNave);
                if (rows.length > 0) {
                    generatedTables.push({ title: `Riepilogo per Nave: ${naviMap.get(naveId) || 'N/A'}`, rows, summary });
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
        const workbook = new ExcelJS.Workbook();
        for (const tableData of reportData) {
            const sheetName = tableData.title.replace(/[\/*?:]/g, "").substring(0, 31);
            const worksheet = workbook.addWorksheet(sheetName);
            const monthName = selectedDate.format('MMMM YYYY');
            const month = selectedDate.startOf('month');
            const giorniDelMese = selectedDate.daysInMonth();
            const titleRow = worksheet.addRow([`${tableData.title} - ${monthName}`]);
            titleRow.font = { name: 'Calibri', size: 16, bold: true };
            titleRow.alignment = { horizontal: 'center' };
            worksheet.mergeCells(1, 1, 1, giorniDelMese + 2);
            worksheet.getRow(1).height = 20;

            const headerRowDays = worksheet.addRow(['Tecnico', ...Array.from({length: giorniDelMese}, (_, i) => month.date(i + 1).format('dd').charAt(0).toUpperCase()), 'Totale Ore']);
            const headerRowNumbers = worksheet.addRow(['', ...Array.from({length: giorniDelMese}, (_, i) => i + 1), '']);
            worksheet.mergeCells('A2:A3'); worksheet.mergeCells(2, giorniDelMese + 2, 3, giorniDelMese + 2);

            const weekendCols: number[] = [];
            for (let i = 1; i <= giorniDelMese; i++) { if ([0, 6].includes(month.date(i).day())) weekendCols.push(i + 1); }

            [headerRowDays, headerRowNumbers].forEach((headerRow) => {
                headerRow.eachCell((cell, colNumber) => {
                    const isWeekend = weekendCols.includes(colNumber);
                    cell.font = { name: 'Calibri', bold: true, color: { argb: isWeekend ? EXPORT_HIGHLIGHT_COLOR_TEXT_EXCEL : HEADER_EXCEL_WHITE_TEXT } };
                    cell.fill = { type: 'pattern', pattern:'solid', fgColor:{ argb: isWeekend ? EXPORT_HIGHLIGHT_COLOR_BG_EXCEL : HEADER_EXCEL_GREEN_BG } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                });
            });

            tableData.rows.forEach(rowData => {
                const rowValues = [rowData.tecnico, ...Array.from({ length: giorniDelMese }, (_, i) => formatCellData(rowData[String(i+1)] as DailyHours)), rowData.totaleOre];
                const row = worksheet.addRow(rowValues);
                const isGtechRow = rowData.dittaId === gtechId;
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const isWeekend = weekendCols.includes(colNumber);
                    if (isGtechRow || isWeekend) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_HIGHLIGHT_COLOR_BG_EXCEL } }; }
                    if (colNumber === 1 || colNumber === giorniDelMese + 2) { cell.font = { bold: true }; }
                    cell.alignment = { vertical: 'middle', horizontal: colNumber > 1 && colNumber < giorniDelMese + 2 ? 'center' : (colNumber === giorniDelMese + 2 ? 'right' : 'left') };
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                });
            });

            worksheet.getColumn(1).width = 30;
            for (let i = 2; i <= giorniDelMese + 1; i++) { worksheet.getColumn(i).width = 5; }
            worksheet.getColumn(giorniDelMese + 2).width = 12;
            
            worksheet.addRow([]);
            
            const displaySummary = processSummaryForDisplay(tableData.summary.byType);
            const sortedSummary = Object.entries(displaySummary).sort((a,b) => a[0].localeCompare(b[0]));
            const summaryHeaders = sortedSummary.map(([tipo]) => tipo);
            const summaryValues = sortedSummary.map(([, ore]) => ore);

            const headerSumRow = worksheet.addRow(['', ...summaryHeaders, 'TOTALE COMPLESSIVO']);
            headerSumRow.font = { bold: true };
            headerSumRow.getCell(1).font = { bold: false };
            const valueSumRow = worksheet.addRow(['Riepilogo Ore', ...summaryValues, tableData.summary.grandTotal]);
            valueSumRow.getCell(1).font = { bold: true };

            if (reportData.indexOf(tableData) === reportData.length - 1) {
                worksheet.addRow([]);
                const legendRow = worksheet.addRow([fullLegendaString]);
                worksheet.mergeCells(legendRow.number, 1, legendRow.number, giorniDelMese + 2);
                legendRow.getCell(1).font = { size: 9 };
                legendRow.getCell(1).alignment = { wrapText: true };
            }
        }
        
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cumulativo_Tecnici_${selectedDate.format('MMMM_YYYY')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        });
    }, [reportData, selectedDate, fullLegendaString, gtechId]);
    
    const handleGeneratePdf = useCallback(() => {
        if (reportData.length === 0) return;
        setIsGeneratingPdf(true); setPdfBlob(null); setIsPdfModalOpen(true);

        setTimeout(() => {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const monthName = selectedDate.format('MMMM YYYY');
            const giorniDelMese = selectedDate.daysInMonth();
            const month = selectedDate.startOf('month');
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const startY = 40;
            let currentY = startY;

            for (let tableIndex = 0; tableIndex < reportData.length; tableIndex++) {
                const tableData = reportData[tableIndex];
                const title = `${tableData.title} - ${monthName}`;
                
                if (tableIndex > 0) {
                    doc.addPage();
                    currentY = startY;
                }

                doc.setFontSize(14);
                doc.text(title, 40, currentY);
                currentY += 20;
        
                const head = [[{ content: 'Tecnico', rowSpan: 2, styles: { valign: 'middle' } }], []];
                for (let i = 1; i <= giorniDelMese; i++) { (head[0] as any[]).push(month.date(i).format('dd').charAt(0).toUpperCase()); (head[1] as any[]).push(String(i)); }
                (head[0] as any[]).push({ content: 'Totale Ore', rowSpan: 2, styles: { valign: 'middle' } });
            
                const body = tableData.rows.map(row => [row.tecnico, ...Array.from({ length: giorniDelMese }, (_, i) => formatCellData(row[String(i+1)] as DailyHours)), String(row.totaleOre as number).replace('.', ',') ]);
                const weekendColIndexes: number[] = [];
                for (let i = 1; i <= giorniDelMese; i++) { if ([0, 6].includes(month.date(i).day())) weekendColIndexes.push(i); }
            
                autoTable(doc, {
                    head: head, body: body, startY: currentY, theme: 'grid',
                    styles: { fontSize: 6.5, cellPadding: 2, textColor: '#000000' },
                    headStyles: { fontStyle: 'bold', halign: 'center', valign: 'middle' },
                    didParseCell: function (data: CellHookData) {
                        const colIdx = data.column.index;
                        if (data.cell.section === 'head') {
                            data.cell.styles.fillColor = HEADER_PDF_GREEN_BG; data.cell.styles.textColor = HEADER_WHITE_TEXT;
                            if (weekendColIndexes.includes(colIdx)) { data.cell.styles.fillColor = EXPORT_HIGHLIGHT_COLOR_BG_PDF; data.cell.styles.textColor = EXPORT_HIGHLIGHT_COLOR_TEXT_PDF; }
                        } else if (data.cell.section === 'body') {
                            const isWeekend = weekendColIndexes.includes(colIdx);
                            const isGtechRow = gtechId && tableData.rows[data.row.index]?.dittaId === gtechId;
                            if (isGtechRow || isWeekend) { data.cell.styles.fillColor = EXPORT_HIGHLIGHT_COLOR_BG_PDF; }
                            if (colIdx === 0 || colIdx === giorniDelMese + 1) { data.cell.styles.fontStyle = 'bold'; }
                            if (colIdx > 0 && colIdx <= giorniDelMese) { data.cell.styles.halign = 'center'; }
                            if (colIdx === giorniDelMese + 1) { data.cell.styles.halign = 'right'; }
                        }
                    },
                });
                currentY = (doc as any).lastAutoTable.finalY;

                const displaySummary = processSummaryForDisplay(tableData.summary.byType);
                const sortedSummary = Object.entries(displaySummary).sort((a,b) => a[0].localeCompare(b[0]));
                const summaryHeaders = sortedSummary.map(([tipo]) => tipo);
                const summaryValues = sortedSummary.map(([, ore]) => String(ore).replace('.', ','));
                const summaryHeight = 60;

                if (currentY + summaryHeight > pageHeight - 60) {
                    doc.addPage();
                    currentY = startY;
                }

                autoTable(doc, {
                    head: [['Riepilogo Ore', ...summaryHeaders, 'TOTALE COMPLESSIVO']],
                    body: [[{content: '', styles: { fillColor: '#ffffff' }}, ...summaryValues, String(tableData.summary.grandTotal).replace('.', ',')]],
                    startY: currentY + 10,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 3 },
                    headStyles: { fillColor: '#444444', textColor: '#ffffff', fontStyle: 'bold' },
                    bodyStyles: { fontStyle: 'bold' },
                });
                currentY = (doc as any).lastAutoTable.finalY + 30;
            }

            const legendHeight = 40;
            if (currentY + legendHeight > pageHeight - 40) {
                doc.addPage();
                currentY = startY;
            }
            
            doc.setFontSize(8);
            doc.setTextColor(0,0,0);
            doc.text(fullLegendaString, 40, currentY, { maxWidth: pageWidth - 80 });
            
            const blob = doc.output('blob');
            setPdfBlob(blob);
            setIsGeneratingPdf(false);
        }, 100); 

    }, [reportData, selectedDate, fullLegendaString, gtechId]);


    const CustomToolbar = () => (
        <GridToolbarContainer>
            <Button color="primary" startIcon={<FileDownloadIcon />} onClick={handleExportToExcel} disabled={reportData.flatMap(t => t.rows).length === 0}>Esporta Excel</Button>
            <Tooltip title="Genera Anteprima PDF e Condividi"><span><IconButton onClick={handleGeneratePdf} disabled={reportData.flatMap(t => t.rows).length === 0 || isGeneratingPdf}><PictureAsPdfIcon /></IconButton></span></Tooltip>
        </GridToolbarContainer>
    );
    
    const isOptionEqualToValue = (option: any, value: any) => getCleanId(option.id) === getCleanId(value.id);
    const hasData = isGenerated && reportData.length > 0 && reportData.some(t => t.rows.length > 0);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='it'>
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        {/* --- RIGA 1 --- */}
                        <Grid item xs={12} sm={4} md={2}><DatePicker label="Mese" views={['month', 'year']} value={selectedDate} onChange={(d) => d && setSelectedDate(d)} slotProps={{ textField: { fullWidth: true } }} /></Grid>
                        <Grid item xs={12} sm={4} md={2}><Autocomplete options={options.clienti} value={selectedCliente} onChange={(_,v) => setSelectedCliente(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Cliente" />} /></Grid>
                        <Grid item xs={12} sm={4} md={2}><Autocomplete multiple options={options.ditte} value={selectedDitte} onChange={(_,v) => setSelectedDitte(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Ditta" />} /></Grid>
                        <Grid item xs={12} sm={4} md={2}><Autocomplete multiple options={options.luoghi} value={selectedLuoghi} onChange={(_,v) => setSelectedLuoghi(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Luoghi" />} /></Grid>
                        <Grid item xs={12} sm={4} md={2}><Autocomplete multiple options={options.navi} value={selectedNavi} onChange={(_,v) => setSelectedNavi(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Nave"/>} /></Grid>
                        <Grid item xs={12} sm={4} md={2}><Autocomplete multiple options={options.categorie} value={selectedCategorie} onChange={(_,v) => setSelectedCategorie(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Categoria" />} /></Grid>

                        {/* --- RIGA 2 --- */}
                        <Grid item xs={12} sm={12} md={4}><Autocomplete multiple options={options.tipiGiornata} value={selectedTipiGiornata} onChange={(_,v) => setSelectedTipiGiornata(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Tipo Giornata" />} /></Grid>
                        <Grid item xs={12} sm={9} md={6}><Autocomplete multiple disableCloseOnSelect options={options.tecnici} value={selectedTecnici} onChange={(_, v) => setSelectedTecnici(v)} getOptionLabel={getTecnicoLabel} isOptionEqualToValue={isOptionEqualToValue}
                                renderOption={(props, option, { selected }) => (<li {...props} key={getCleanId(option.id)}><Checkbox icon={<CheckBoxOutlineBlankIcon fontSize="small" />} checkedIcon={<CheckBoxIcon fontSize="small" />} checked={selected} />{getTecnicoLabel(option)}</li>)}
                                renderInput={(params) => <TextField {...params} label="Tecnici" />}/></Grid>
                        <Grid item xs={12} sm={3} md={2}><Button variant="contained" size="large" onClick={handleGeneraMatrice} disabled={isLoading || !allAnagrafiche} sx={{ width: '100%', height: '56px' }}>{isLoading ? <CircularProgress size={24}/> : 'Genera'}</Button></Grid>
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
                                        <Grid item xs={12} md><Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>{table.title}</Typography></Grid>
                                        <Grid item xs={12} md='auto'>
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
