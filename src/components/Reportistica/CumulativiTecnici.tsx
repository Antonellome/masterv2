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
import { Tecnico, Nave, Ditta, Categoria, Rapportino, TipoGiornata } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import PdfPreviewDialog from '@/components/common/PdfPreviewDialog';

dayjs.locale('it');
dayjs.extend(isBetween);

// --- CONFIGURAZIONE STILI ---
const UI_HIGHLIGHT_COLOR = '#555555';
const EXPORT_HIGHLIGHT_COLOR_BG_PDF = 'E0E0E0';
const EXPORT_HIGHLIGHT_COLOR_BG_EXCEL = 'FFE0E0E0';
const EXPORT_HIGHLIGHT_COLOR_TEXT = 'FF000000';
const HEADER_EXCEL_GREEN_BG = 'FF16A085';
const HEADER_EXCEL_WHITE_TEXT = 'FFFFFFFF';


// --- LEGGENDE STATICI --- 
const legendaCodici: Record<string, string> = {
    'F': 'Ferie',
    'L': '104',
    'M': 'Malattia',
    'P': 'Permesso',
    'FE': 'Festivo',
    'T': 'Trasferta',
    'N': 'Notturna (Cartour Delta)'
};

const formatoOreLegenda: Record<string, string> = {
    "'8'": "Ore Ordinarie",
    "'+'3": "Ore Straordinarie",
    "'8+'3": "8 Ordinarie + 3 Straordinarie",
};

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


// --- FUNZIONI DI UTILITY ---
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

const getTecnicoLabel = (option: any): string => {
    if (option && typeof option === 'object' && option.cognome && option.nome) return `${option.cognome} ${option.nome}`;
    if (typeof option === 'string') return option;
    return '';
};

const getGenericLabel = (option: any): string => {
    if (option && typeof option === 'object' && option.nome) return option.nome;
    if (typeof option === 'string') return option;
    return '';
};

// --- STRUTTURE DATI CORRETTE ---
interface DailyHours {
    workable: number;
    straordinarioPuro: number;
    codice: string | null;
    oreCodice: number;
}

interface PivotGridRowData {
    id: string;
    tecnico: string;
    totaleOre: number;
    dittaId?: string;
    [day: string]: DailyHours | number | string;
}

const CumulativiTecnici: React.FC = () => {
    const theme = useTheme();
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    
    const [rows, setRows] = useState<GridRowsProp>([]);
    const [cols, setCols] = useState<GridColDef[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfDataUri, setPdfDataUri] = useState('');
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

    const allAnagrafiche = useLiveQuery(() => Promise.all([
        db.ditte.toArray(),
        db.categorie.toArray(),
        db.navi.toArray(),
        db.tecnici.toArray(),
        db.tipiGiornata.toArray(),
    ]), []);

    const [anagraficaDitte, anagraficaCategorie, anagraficaNavi, anagraficaTecnici, anagraficaTipiGiornata] = allAnagrafiche || [[], [], [], [], []];

    const [selectedDitte, setSelectedDitte] = useState<Ditta[]>([]);
    const [selectedCategorie, setSelectedCategorie] = useState<Categoria[]>([]);
    const [selectedTecnici, setSelectedTecnici] = useState<Tecnico[]>([]);
    const [selectedNavi, setSelectedNavi] = useState<Nave[]>([]);

    const gtechId = useMemo(() => anagraficaDitte.find(d => d.nome?.toLowerCase() === 'g-tech')?.id, [anagraficaDitte]);

    const fullLegendaString = useMemo(() => {
        const oreParts = Object.entries(formatoOreLegenda).map(([key, value]) => `${key} = ${value}`);
        const codiciParts = Object.entries(legendaCodici).map(([key, value]) => `${key} = ${value}`);
        return `Legenda: ${[...oreParts, ...codiciParts].join('; ')}`;
    }, []);

    const options = useMemo(() => {
        const safeSort = (arr: any[], labelFn: (item: any) => string) => arr.filter(Boolean).sort((a, b) => labelFn(a).localeCompare(labelFn(b)));
        return {
            ditte: safeSort(anagraficaDitte.filter(i => i.nome), getGenericLabel),
            categorie: safeSort(anagraficaCategorie.filter(i => i.nome), getGenericLabel),
            navi: safeSort(anagraficaNavi.filter(i => i.nome), getGenericLabel),
            tecnici: safeSort(anagraficaTecnici.filter(i => i.nome && i.cognome), getTecnicoLabel)
        };
    }, [allAnagrafiche]);

    useEffect(() => {
         setIsGenerated(false);
    }, [selectedDate, selectedDitte, selectedCategorie, selectedTecnici, selectedNavi]);

    const formatCellData = (dayData: DailyHours | undefined): string => {
        if (!dayData || (dayData.workable === 0 && dayData.straordinarioPuro === 0 && !dayData.codice && dayData.oreCodice === 0)) {
            return '';
        }

        if (dayData.codice && !['T', 'N'].includes(dayData.codice)) {
            const ore = dayData.oreCodice > 0 ? dayData.oreCodice : 8;
            return `${dayData.codice}${String(ore).replace('.', ',')}`;
        }

        const oreOrdinarie = Math.min(dayData.workable, 8);
        const straordinarioDaSplit = Math.max(0, dayData.workable - 8);
        const straordinarioTotale = straordinarioDaSplit + dayData.straordinarioPuro;

        let workString = '';
        if (oreOrdinarie > 0 && straordinarioTotale > 0) {
            workString = `${String(oreOrdinarie).replace('.', ',')}+${String(straordinarioTotale).replace('.', ',')}`;
        } else if (oreOrdinarie > 0) {
            workString = String(oreOrdinarie).replace('.', ',');
        } else if (straordinarioTotale > 0) {
            workString = `+${String(straordinarioTotale).replace('.', ',')}`;
        }
        
        let codeString = '';
        if (dayData.codice === 'T') {
            codeString = 'T';
        } else if (dayData.codice === 'N' && dayData.oreCodice > 0) {
            codeString = `${String(dayData.oreCodice).replace('.', ',')}N`;
        }

        return [workString, codeString].filter(Boolean).join('+');
    };

    const handleGeneraMatrice = async () => {
        if (!allAnagrafiche) return;
        setIsLoading(true);

        const startOfMonth = selectedDate.startOf('month');
        const endOfMonth = selectedDate.endOf('month');
        const giorniDelMese = selectedDate.daysInMonth();

        const allRapportini = await db.rapportini.toArray();
        const rapportiniDelMese = allRapportini.filter(r => {
            const dataDaNormalizzare = (r as any).dataInizio || r.data;
            const dataNormalizzata = normalizeDate(dataDaNormalizzare);
            if (!dataNormalizzata) return false;
            const dataRapportino = dayjs(dataNormalizzata);
            return dataRapportino.isValid() && dataRapportino.isBetween(startOfMonth, endOfMonth, null, '[]');
        });
        
        const tipiGiornataMap = new Map(anagraficaTipiGiornata.map(t => [getCleanId(t.id), t]));
        const tecniciMap = new Map(anagraficaTecnici.map(t => [getCleanId(t.id), t]));
        
        const ditteIds = selectedDitte.length > 0 ? new Set(selectedDitte.map(d => getCleanId(d.id))) : null;
        const naviIds = selectedNavi.length > 0 ? new Set(selectedNavi.map(n => getCleanId(n.id))) : null;
        const categorieIds = selectedCategorie.length > 0 ? new Set(selectedCategorie.map(c => getCleanId(c.id))) : null;

        const filteredRapportini = rapportiniDelMese.filter(r => 
            (!ditteIds || ditteIds.has(getCleanId(r.dittaId))) &&
            (!naviIds || naviIds.has(getCleanId(r.naveId))) &&
            (!categorieIds || categorieIds.has(getCleanId(r.categoriaId)))
        );

        const allInvolvedTecnicoIds = new Set<string>();
        filteredRapportini.forEach(r => {
            const addId = (id: any) => { const cleanId = getCleanId(id); if (cleanId) allInvolvedTecnicoIds.add(cleanId); };
            addId(r.tecnicoId);
            (r.altriTecniciIds || []).forEach(addId);
            (r.presenze || []).forEach(addId);
            (r.dettaglioOreTecnici || []).forEach(d => addId(d.tecnicoId));
        });

        const selectedTecniciIds = selectedTecnici.length > 0 ? new Set(selectedTecnici.map(t => getCleanId(t.id))) : null;
        const finalTecnicoIds = Array.from(allInvolvedTecnicoIds).filter(id => !selectedTecniciIds || selectedTecniciIds.has(id));

        const righeDaGenerare = new Map<string, PivotGridRowData>();
        finalTecnicoIds.forEach(id => {
            if (id && tecniciMap.has(id)) {
                const info = tecniciMap.get(id)!;
                const newRow: PivotGridRowData = { 
                    id, 
                    tecnico: `${info.cognome} ${info.nome}`, 
                    totaleOre: 0,
                    dittaId: getCleanId(info.dittaId)
                };
                for (let i = 1; i <= giorniDelMese; i++) { newRow[String(i)] = { workable: 0, straordinarioPuro: 0, codice: null, oreCodice: 0 }; }
                righeDaGenerare.set(id, newRow);
            }
        });

        for (const r of filteredRapportini) {
            const dataRapportino = normalizeDate((r as any).dataInizio || r.data);
            if (!dataRapportino) continue;
            const giorno = dayjs(dataRapportino).date().toString();

            const tipoGiornataId = getCleanId(r.tipoGiornataId);
            const tipoGiornata = tipoGiornataId ? tipiGiornataMap.get(tipoGiornataId) : undefined;
            let codice = getTipoGiornataCodice(tipoGiornata);

            if (getCleanId(r.naveId) === 'y96J0gTZ5fIlYKkSgeNR' && dayjs(dataRapportino).hour() >= 21) {
                codice = 'N';
            }

            const processHoursForTecnico = (id: string, ore: number) => {
                const cleanId = getCleanId(id);
                if (cleanId && righeDaGenerare.has(cleanId)) {
                    const riga = righeDaGenerare.get(cleanId)!;
                    const dayData = riga[giorno] as DailyHours;
                    
                    if (codice) {
                        dayData.codice = codice;
                        dayData.oreCodice += ore;
                    } else if (tipoGiornata?.nome.toLowerCase().includes('straordinar')) {
                        dayData.straordinarioPuro += ore;
                    } else { 
                        dayData.workable += ore;
                    }
                }
            };

            const isNewHybridModel = r.dettaglioOreTecnici && Array.isArray(r.dettaglioOreTecnici) && r.dettaglioOreTecnici.length > 0;
            if (isNewHybridModel) {
                const techsWhoGotHours = new Set<string>();
                r.dettaglioOreTecnici!.forEach(d => {
                    const cleanId = getCleanId(d.tecnicoId);
                    const oreNumeriche = d.ore ? parseFloat(String(d.ore).replace(',', '.')) : 0;
                    if (cleanId && oreNumeriche > 0) {
                        processHoursForTecnico(cleanId, oreNumeriche);
                        techsWhoGotHours.add(cleanId);
                    }
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
                    const addId = (id: any) => {const c = getCleanId(id); if(c) allLegacyTecnici.add(c)};
                    addId(r.tecnicoId);(r.altriTecniciIds || []).forEach(addId);(r.presenze || []).forEach(addId);
                    const numeroTecnici = allLegacyTecnici.size;
                    if(numeroTecnici > 0) {
                       const orePerTecnico = monteOre / numeroTecnici;
                       allLegacyTecnici.forEach(id => processHoursForTecnico(id, orePerTecnico));
                    }
                }
            }
        }
        
        const finalRows = Array.from(righeDaGenerare.values());
        finalRows.forEach(riga => {
            let total = 0;
            for (let i = 1; i <= giorniDelMese; i++) {
                const dayData = riga[String(i)] as DailyHours;
                const oreCodiceContabili = (dayData.codice && !['T'].includes(dayData.codice)) ? dayData.oreCodice : 0;
                total += dayData.workable + dayData.straordinarioPuro + oreCodiceContabili;
            }
            riga.totaleOre = total;
        });

        const pivotCols: GridColDef[] = [
            { field: 'tecnico', headerName: 'Tecnico', width: 200, frozen: true, cellClassName: 'tecnico-cell' },
        ];
        for (let i = 1; i <= giorniDelMese; i++) {
            const day = startOfMonth.date(i);
            pivotCols.push({ 
                field: String(i), headerName: String(i), width: 80, align: 'center', headerAlign: 'center', type: 'string', 
                cellClassName: (day.day() === 0 || day.day() === 6) ? 'highlight-cell' : '',
                renderCell: (params) => formatCellData(params.value as DailyHours)
            });
        }
        pivotCols.push({ field: 'totaleOre', headerName: 'Totale Ore', width: 120, type: 'number', align: 'right', headerAlign: 'right', cellClassName: 'total-ore-cell' });
        
        setCols(pivotCols);
        setRows(finalRows.filter(r => r.totaleOre > 0).sort((a, b) => String(a.tecnico).localeCompare(String(b.tecnico))));
        setIsGenerated(true);
        setIsLoading(false);
    };

    const handleExportToExcel = useCallback(async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Cumulativo_${selectedDate.format('MM_YYYY')}`);
        
        const monthName = selectedDate.format('MMMM YYYY');
        const month = selectedDate.startOf('month');
        const giorniDelMese = selectedDate.daysInMonth();
    
        // Titolo
        const titleRow = worksheet.addRow([monthName]);
        titleRow.font = { name: 'Calibri', size: 16, bold: true };
        titleRow.alignment = { horizontal: 'center' };
        worksheet.mergeCells(1, 1, 1, giorniDelMese + 2);
        worksheet.getRow(1).height = 20;

        // Header
        const headerRowDays = worksheet.addRow(['Tecnico', ...Array.from({length: giorniDelMese}, (_, i) => month.date(i + 1).format('dd').charAt(0).toUpperCase()), 'Totale Ore']);
        const headerRowNumbers = worksheet.addRow(['', ...Array.from({length: giorniDelMese}, (_, i) => i + 1), '']);

        worksheet.mergeCells('A2:A3');
        worksheet.mergeCells(2, giorniDelMese + 2, 3, giorniDelMese + 2);

        const weekendCols: number[] = [];
        for (let i = 1; i <= giorniDelMese; i++) {
            if ([0, 6].includes(month.date(i).day())) {
                weekendCols.push(i + 1); // +1 because column 1 is "Tecnico"
            }
        }

        [headerRowDays, headerRowNumbers].forEach((headerRow, index) => {
            headerRow.eachCell((cell, colNumber) => {
                const isWeekend = weekendCols.includes(colNumber);
                cell.font = { 
                    name: 'Calibri',
                    bold: true, 
                    color: { argb: isWeekend ? EXPORT_HIGHLIGHT_COLOR_TEXT : HEADER_EXCEL_WHITE_TEXT }
                };
                cell.fill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb: isWeekend ? EXPORT_HIGHLIGHT_COLOR_BG_EXCEL : HEADER_EXCEL_GREEN_BG}
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: {style:'thin'},
                    left: {style:'thin'},
                    bottom: {style:'thin'},
                    right: {style:'thin'}
                };
            });
        });

        // Body
        rows.forEach(rowData => {
            const rowValues = [rowData.tecnico];
            for (let i = 1; i <= giorniDelMese; i++) {
                rowValues.push(formatCellData(rowData[String(i)] as DailyHours));
            }
            rowValues.push(rowData.totaleOre as number);
            
            const row = worksheet.addRow(rowValues);
            const isGtechRow = rowData.dittaId === gtechId;

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const isWeekend = weekendCols.includes(colNumber);
                
                if (isGtechRow || isWeekend) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: EXPORT_HIGHLIGHT_COLOR_BG_EXCEL }
                    };
                }

                if (colNumber === 1 || colNumber === giorniDelMese + 2) {
                    cell.font = { bold: true };
                }

                cell.alignment = { 
                    vertical: 'middle', 
                    horizontal: colNumber > 1 && colNumber < giorniDelMese + 2 ? 'center' : (colNumber === giorniDelMese + 2 ? 'right' : 'left') 
                };
                cell.border = {
                    top: {style:'thin'},
                    left: {style:'thin'},
                    bottom: {style:'thin'},
                    right: {style:'thin'}
                };
            });
        });

        // Column Widths
        worksheet.getColumn(1).width = 30;
        for (let i = 2; i <= giorniDelMese + 1; i++) {
            worksheet.getColumn(i).width = 5;
        }
        worksheet.getColumn(giorniDelMese + 2).width = 12;

        // Legenda
        worksheet.addRow([]);
        const legendRow = worksheet.addRow([fullLegendaString]);
        worksheet.mergeCells(legendRow.number, 1, legendRow.number, giorniDelMese + 2);
        legendRow.getCell(1).font = { size: 9 };
        legendRow.getCell(1).alignment = { wrapText: true };
        

        // Download
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cumulativo_Tecnici_${selectedDate.format('MMMM_YYYY')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        });

    }, [rows, selectedDate, fullLegendaString, gtechId]);
    

    const handleGeneratePdf = useCallback(() => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const monthName = selectedDate.format('MMMM YYYY');
        const giorniDelMese = selectedDate.daysInMonth();
        const month = selectedDate.startOf('month');
    
        doc.text(`Report Cumulativo: ${monthName}`, 40, 35);
    
        const headerRowDays = [{ content: 'Tecnico', rowSpan: 2, styles: { valign: 'middle' } }];
        const headerRowNumbers = [];
    
        for (let i = 1; i <= giorniDelMese; i++) {
            headerRowDays.push(month.date(i).format('dd').charAt(0).toUpperCase());
            headerRowNumbers.push(String(i));
        }
        headerRowDays.push({ content: 'Totale Ore', rowSpan: 2, styles: { valign: 'middle' } });
        
        const head = [headerRowDays, headerRowNumbers];
    
        const body = rows.map(row => {
            const rowData: (string | number)[] = [row.tecnico as string];
            for (let i = 1; i <= giorniDelMese; i++) {
                rowData.push(formatCellData(row[String(i)] as DailyHours));
            }
            rowData.push(String((row.totaleOre as number)).replace('.', ','));
            return rowData;
        });
    
        const weekendColIndexes: number[] = [];
        for (let i = 1; i <= giorniDelMese; i++) {
            const date = month.date(i);
            if (date.day() === 0 || date.day() === 6) {
                weekendColIndexes.push(i);
            }
        }
    
        autoTable(doc, {
            head: head,
            body: body,
            startY: 50,
            theme: 'grid',
            styles: { fontSize: 6.5, cellPadding: 2, textColor: '#000000' },
            headStyles: {
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
            },
            didParseCell: function (data) {
                const colIdx = data.column.index;
    
                if (data.cell.section === 'head') {
                    data.cell.styles.fillColor = [22, 160, 133];
                    data.cell.styles.textColor = 255;
    
                    if (weekendColIndexes.includes(colIdx)) {
                        data.cell.styles.fillColor = `#${EXPORT_HIGHLIGHT_COLOR_BG_PDF}`;
                        data.cell.styles.textColor = `#${EXPORT_HIGHLIGHT_COLOR_TEXT}`;
                    }
                } else if (data.cell.section === 'body') {
                    const isWeekend = weekendColIndexes.includes(colIdx);
                    const isGtechRow = gtechId && rows[data.row.index]?.dittaId === gtechId;
    
                    data.cell.styles.fillColor = '#FFFFFF';
                    
                    if (isGtechRow || isWeekend) {
                        data.cell.styles.fillColor = `#${EXPORT_HIGHLIGHT_COLOR_BG_PDF}`;
                    }
                    
                    if (colIdx === 0 || colIdx === giorniDelMese + 1) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                     if (colIdx > 0 && colIdx <= giorniDelMese) {
                        data.cell.styles.halign = 'center';
                     }
                     if (colIdx === giorniDelMese + 1) {
                         data.cell.styles.halign = 'right';
                     }
                }
            },
        });
    
        const legendStartY = (doc as any).lastAutoTable.finalY + 20;
        const margin = 40;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxWidth = pageWidth - margin * 2;
        
        doc.setFontSize(8);
        doc.setTextColor(0,0,0);
        doc.text(fullLegendaString, margin, legendStartY, { maxWidth: maxWidth });
        
        const blob = doc.output('blob');
        setPdfBlob(blob);
        setPdfDataUri(doc.output('datauristring'));
        setIsPdfModalOpen(true);
    }, [rows, selectedDate, fullLegendaString, gtechId]);


    const handleDownloadPdf = () => {
        if (!pdfBlob) return;
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_Cumulativo_Tecnici_${selectedDate.format('MMMM_YYYY')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleSharePdf = async () => {
        if (!pdfBlob) return;
        const fileName = `Report_Cumulativo_Tecnici_${selectedDate.format('MMMM_YYYY')}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: `Report Cumulativo Tecnici - ${selectedDate.format('MMMM YYYY')}`,
                    text: `In allegato il report cumulativo di ${selectedDate.format('MMMM YYYY')}.`,
                });
            } catch (error) {
                console.error('Errore during la condivisione:', error);
            }
        } else {
            alert('La condivisione di file non è supportata su questo browser.');
        }
    };

    const CustomToolbar = () => (
        <GridToolbarContainer>
            <Button color="primary" startIcon={<FileDownloadIcon />} onClick={handleExportToExcel} disabled={rows.length === 0}>Esporta Excel</Button>
            <Tooltip title="Genera Anteprima PDF e Condividi">
                <span>
                    <IconButton onClick={handleGeneratePdf} disabled={rows.length === 0}>
                        <PictureAsPdfIcon />
                    </IconButton>
                </span>
            </Tooltip>
        </GridToolbarContainer>
    );
    
    const isOptionEqualToValue = (option: any, value: any) => getCleanId(option.id) === getCleanId(value.id);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='it'>
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}><DatePicker label="Mese" views={['month', 'year']} value={selectedDate} onChange={(d) => d && setSelectedDate(d)} slotProps={{ textField: { fullWidth: true } }} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Autocomplete multiple options={options.ditte} value={selectedDitte} onChange={(_,v) => setSelectedDitte(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Filtra Ditta" />} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Autocomplete multiple options={options.categorie} value={selectedCategorie} onChange={(_,v) => setSelectedCategorie(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Filtra Categoria" />} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Autocomplete multiple options={options.navi} value={selectedNavi} onChange={(_,v) => setSelectedNavi(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={isOptionEqualToValue} renderInput={(p) => <TextField {...p} label="Filtra Nave"/>} /></Grid>
                        <Grid item xs={12} sm={6} md={5}><Autocomplete multiple disableCloseOnSelect options={options.tecnici} value={selectedTecnici} onChange={(_, v) => setSelectedTecnici(v)} getOptionLabel={getTecnicoLabel} isOptionEqualToValue={isOptionEqualToValue}
                                renderOption={(props, option, { selected }) => (<li {...props} key={getCleanId(option.id)}><Checkbox icon={<CheckBoxOutlineBlankIcon fontSize="small" />} checkedIcon={<CheckBoxIcon fontSize="small" />} checked={selected} />{getTecnicoLabel(option)}</li>)}
                                renderInput={(params) => <TextField {...params} label="Filtra Tecnici" />}/></Grid>
                        <Grid item xs={12} sm={12} md={3}><Button variant="contained" size="large" onClick={handleGeneraMatrice} disabled={isLoading || !allAnagrafiche} sx={{ width: '100%' }}>{isLoading ? <CircularProgress size={24}/> : 'Genera Report'}</Button></Grid>
                    </Grid>
                </Paper>
                
                {(isGenerated && rows.length === 0 && !isLoading) && <Alert severity="info">Nessun dato per i filtri selezionati.</Alert>}
                
                {rows.length > 0 && isGenerated && (
                    <Box sx={{ height: '70vh', width: '100%' }}>
                        <Paper elevation={3} sx={{ height: '100%', width: '100%', p: 2 }}>
                            <DataGrid 
                                rows={rows} 
                                columns={cols} 
                                density="compact" 
                                slots={{ toolbar: CustomToolbar }}
                                getRowClassName={(params) => params.row.dittaId === gtechId ? 'gtech-row' : ''}
                                sx={{
                                    '& .MuiDataGrid-cell.highlight-cell': { bgcolor: UI_HIGHLIGHT_COLOR },
                                    '& .tecnico-cell': { fontWeight: 'bold' },
                                    '& .total-ore-cell': { fontWeight: 'bold' },
                                    '& .gtech-row .MuiDataGrid-cell': { bgcolor: UI_HIGHLIGHT_COLOR }
                                }}
                            />
                        </Paper>
                    </Box>
                )}

                {isGenerated && rows.length > 0 && (
                    <Paper elevation={1} sx={{ mt: 2, p: 2 }}>
                        <Typography variant="caption" component="p">
                            {fullLegendaString}
                        </Typography>
                    </Paper>
                )}
            </Box>
            <PdfPreviewDialog
                open={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                pdfDataUri={pdfDataUri}
                onDownload={handleDownloadPdf}
                onShare={handleSharePdf}
                canShare={!!navigator.share && !!pdfBlob}
            />
        </LocalizationProvider>
    );
};

export default CumulativiTecnici;
