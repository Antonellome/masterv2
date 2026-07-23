import React, { useState, useMemo, useRef } from 'react';
import { Paper, Box, Button, CircularProgress, Autocomplete, TextField, Checkbox, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, useTheme } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Tecnico, Ditta, CategoriaTecnico, Nave, TipoGiornata, Impostazioni } from '@/models/definitions';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { calcolaDatiReportMatrice, GroupedMatrixReportData, RawData } from '@/utils/reportUtils';
import { useReactToPrint } from 'react-to-print';

dayjs.locale('it');

// --- CONFIGURAZIONE STILI --- 
const UI_HIGHLIGHT_COLOR = '#E0E0E0';
const PRINT_HIGHLIGHT_COLOR = '#E0E0E0';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

const safeQuery = <T,>(query: () => Promise<T[] | undefined> | undefined): () => Promise<T[] | any[]> => {
    return () => {
        try {
            const promise = query?.();
            return promise || Promise.resolve([]);
        } catch (e) {
            console.error("SafeQuery caught an error:", e);
            return Promise.resolve([]);
        }
    };
};

const MensileTecnici: React.FC = () => {
    const theme = useTheme();
    const printRef = useRef<HTMLDivElement>(null);

    const allDitte = useLiveQuery(safeQuery(() => db.ditte?.toArray()), []);
    const allCategorie = useLiveQuery(safeQuery(() => db.categorieTecnici?.toArray()), []);
    const allTecnici = useLiveQuery(safeQuery(() => db.tecnici?.toArray()), []);
    const allNavi = useLiveQuery(safeQuery(() => db.navi?.toArray()), []);
    const allRapportini = useLiveQuery(safeQuery(() => db.rapportini?.toArray()), []);
    const allTipiGiornata = useLiveQuery(safeQuery(() => db.tipiGiornata?.toArray()), []);
    const impostazioni = useLiveQuery(() => db.impostazioni?.get(1), []);

    const gtechId = useMemo(() => allDitte?.find(d => d.nome?.toLowerCase() === 'g-tech')?.id, [allDitte]);

    const ditteLoading = allDitte === undefined;
    const categorieLoading = allCategorie === undefined;
    const naviLoading = allNavi === undefined;
    const tecniciLoading = allTecnici === undefined;
    const reportPrereqsLoading = allRapportini === undefined || allTipiGiornata === undefined || allNavi === undefined;

    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [selectedDitta, setSelectedDitta] = useState<Ditta | null>(null);
    const [selectedCategoria, setSelectedCategoria] = useState<CategoriaTecnico | null>(null);
    const [selectedNavi, setSelectedNavi] = useState<Nave[]>([]);
    const [selectedTecnici, setSelectedTecnici] = useState<Tecnico[]>([]);
    const [reportData, setReportData] = useState<GroupedMatrixReportData | null>(null);

    const ditteMap = useMemo(() => new Map((allDitte || []).map(d => [d.id, d])), [allDitte]);
    const ditteOptions = useMemo(() => allDitte || [], [allDitte]);
    const categorieOptions = useMemo(() => allCategorie || [], [allCategorie]);
    const naviOptions = useMemo(() => 
        allNavi ? [...allNavi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')) : [], 
    [allNavi]);

    const fullLegendaString = useMemo(() => {
        const formatoOreLegenda: Record<string, string> = {
            "'8'": "Ore Ordinarie", "+'3": "Ore Straordinarie", "'8+3'": "8 Ordinarie + 3 Straordinarie",
        };
        const legendaCodici: Record<string, string> = {
            'F': 'Ferie', 'M': 'Malattia', 'P': 'Permesso', 'FE': 'Festivo', 'L': '104', 'N': 'Notturna'
        };
        const oreParts = Object.entries(formatoOreLegenda).map(([key, value]) => `${key} = ${value}`);
        const codiciParts = Object.entries(legendaCodici).map(([key, value]) => `${key} = ${value}`);
        return `Legenda: ${[...oreParts, ...codiciParts].join('; ')}`;
    }, []);

    const filteredTecnici = useMemo(() => {
        if (!allTecnici) return [];
        return allTecnici
            .filter(t => 
                (!selectedDitta || t.dittaId === selectedDitta.id) &&
                (!selectedCategoria || t.categoriaId === selectedCategoria.id)
            )
            .sort((a, b) => ((a?.cognome || '') + ' ' + (a?.nome || '')).localeCompare((b?.cognome || '') + ' ' + (b?.nome || '')));
    }, [allTecnici, selectedDitta, selectedCategoria]);
    
    const giorniDelMese = useMemo(() => 
        Array.from({ length: selectedMonth.daysInMonth() }, (_, i) => i + 1), 
    [selectedMonth]);

    const handleGenerateReport = () => {
        if (reportPrereqsLoading || !allRapportini || !allTipiGiornata || !allNavi) return;
        setIsGenerating(true);
        setReportData(null);

        const rawData: RawData = {
            rapportini: allRapportini, tipiGiornata: allTipiGiornata, 
            impostazioni: impostazioni as Impostazioni | undefined, navi: allNavi
        };
        
        setTimeout(() => {
            const result = calcolaDatiReportMatrice(selectedTecnici, selectedMonth, rawData, selectedNavi);
            setReportData(result);
            setIsGenerating(false);
        }, 50);
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Report Mensile - ${selectedMonth.format('MMMM YYYY')}`,
    });
    
    const handleDittaChange = (_: any, value: Ditta | null) => {
        setSelectedDitta(value);
        setSelectedTecnici([]);
        setReportData(null);
    };

    const handleCategoriaChange = (_: any, value: CategoriaTecnico | null) => {
        setSelectedCategoria(value);
        setSelectedTecnici([]);
        setReportData(null);
    };

    const handleNaviChange = (_: any, value: Nave[]) => { setSelectedNavi(value); setReportData(null); }
    const handleTecniciChange = (_: any, value: Tecnico[]) => { setSelectedTecnici(value); setReportData(null); }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Filtri Report</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                        <Autocomplete options={ditteOptions} getOptionLabel={(o) => o?.nome || ''} value={selectedDitta} onChange={handleDittaChange} renderInput={(p) => <TextField {...p} label="Ditta" />} loading={ditteLoading} isOptionEqualToValue={(o, v) => o.id === v.id}/>
                        <Autocomplete options={categorieOptions} getOptionLabel={(o) => o?.nome || ''} value={selectedCategoria} onChange={handleCategoriaChange} renderInput={(p) => <TextField {...p} label="Categoria" />} loading={categorieLoading} isOptionEqualToValue={(o, v) => o.id === v.id}/>
                        <DatePicker views={['month', 'year']} label="Mese Report" value={selectedMonth} onChange={(v) => { if (v) {setSelectedMonth(v); setReportData(null);}}} />
                    </Box>
                     <Autocomplete multiple options={naviOptions} disableCloseOnSelect getOptionLabel={(o) => o?.nome || ''} value={selectedNavi} onChange={handleNaviChange} renderOption={(props, o, { selected }) => (<li {...props} key={o.id}><Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />{o?.nome || 'Nome mancante'}</li>)} renderInput={(p) => <TextField {...p} label="Filtra per Navi (opzionale)" />} loading={naviLoading} isOptionEqualToValue={(o, v) => o.id === v.id} sx={{ mb: 2 }}/>
                    <Autocomplete multiple options={filteredTecnici} disableCloseOnSelect getOptionLabel={(o) => `${o?.cognome || ''} ${o?.nome || ''}`.trim()} value={selectedTecnici} onChange={handleTecniciChange} renderOption={(props, o, { selected }) => (<li {...props} key={o.id}><Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />{`${o?.cognome || ''} ${o?.nome || ''}`.trim()}</li>)} renderInput={(p) => <TextField {...p} label="Seleziona Tecnici" />} loading={tecniciLoading} isOptionEqualToValue={(o, v) => o.id === v.id}/>
                     <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
                         <Button onClick={() => setSelectedTecnici(filteredTecnici)} variant="text" disabled={filteredTecnici.length === 0}>Seleziona Tutti</Button>
                         <Button onClick={() => setSelectedTecnici([])} variant="text">Deseleziona Tutti</Button>
                        <Button variant="contained" onClick={handleGenerateReport} disabled={isGenerating || selectedTecnici.length === 0 || reportPrereqsLoading} startIcon={isGenerating ? <CircularProgress size={20} /> : null}>{isGenerating ? 'Generando...' : 'Genera Report'}</Button>
                    </Box>
                </Paper>

                {reportData && Object.keys(reportData).length > 0 && (
                     <Paper sx={{p: 2}}>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Report di {selectedMonth.format('MMMM YYYY')}</Typography>
                            <Button variant='outlined' onClick={handlePrint}>Stampa</Button>
                         </Box>
                        <Box ref={printRef} sx={{
                            '@media print': {
                                'table, tr, td, th': { border: '1px solid black !important', borderColor: 'black !important', color: 'black !important', fontSize: '9pt', padding: '2px 4px' },
                                'th': { backgroundColor: '#f2f2f2' },
                                '.highlight': { backgroundColor: `${PRINT_HIGHLIGHT_COLOR} !important`, printColorAdjust: 'exact' },
                                'body': { backgroundColor: 'white' }, 
                            }
                        }}>
                        {Object.entries(reportData).map(([naveId, naveData]) => (
                            <Box key={naveId} sx={{ mb: 4 }}>
                                <Typography variant="h5" gutterBottom component="div" sx={{ '@media print': { color: 'black' } }}>{naveData.naveNome}</Typography>
                                <TableContainer component={Paper}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{position: 'sticky', left: 0, zIndex: 1, backgroundColor: theme.palette.background.paper, textTransform: 'capitalize' }}>
                                                    {selectedMonth.format('MMMM YYYY')}
                                                </TableCell>
                                                {giorniDelMese.map(giorno => {
                                                    const date = selectedMonth.date(giorno);
                                                    const isWeekend = date.day() === 0 || date.day() === 6;
                                                    return (
                                                        <TableCell 
                                                            key={giorno} 
                                                            align="center" 
                                                            sx={{ backgroundColor: isWeekend ? UI_HIGHLIGHT_COLOR : 'inherit'}} 
                                                            className={isWeekend ? 'highlight' : ''}
                                                        >
                                                            {giorno}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {naveData.tecnici
                                                .sort((a, b) => (ditteMap.get(a.dittaId!)?.nome || '').localeCompare(ditteMap.get(b.dittaId!)?.nome || '') || (a.cognome + a.nome).localeCompare(b.cognome + b.nome))
                                                .map(tecnico => {
                                                    const isGtech = tecnico.dittaId === gtechId;
                                                    const rowSx = isGtech ? { backgroundColor: UI_HIGHLIGHT_COLOR } : {};
                                                    return (
                                                        <TableRow key={tecnico.id} sx={rowSx} className={isGtech ? 'highlight' : ''}>
                                                            <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, ...rowSx }}>
                                                                <Chip size="small" label={ditteMap.get(tecnico.dittaId!)?.sigla || ''} sx={{mr: 1}}/>
                                                                {tecnico.cognome} {tecnico.nome}
                                                            </TableCell>
                                                            {giorniDelMese.map(giorno => {
                                                                const date = selectedMonth.date(giorno);
                                                                const isWeekend = date.day() === 0 || date.day() === 6;
                                                                const cellSx = isWeekend && !isGtech ? { backgroundColor: UI_HIGHLIGHT_COLOR } : {};
                                                                return (
                                                                    <TableCell key={`${tecnico.id}-${giorno}`} align="center" sx={cellSx} className={(isWeekend && !isGtech) ? 'highlight' : ''}>
                                                                        {naveData.reportData[tecnico.id]?.[giorno] || ''}
                                                                    </TableCell>
                                                                )
                                                            })}
                                                        </TableRow>
                                                    )
                                                })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        ))}
                        <Paper elevation={0} sx={{ mt: 2, p: 1, backgroundColor: 'transparent' }}>
                           <Typography variant="caption" component="p" sx={{ '@media print': { color: 'black' } }}>{fullLegendaString}</Typography>
                        </Paper>
                        </Box>
                    </Paper>
                )}
                {isGenerating && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
                )}
                 {reportData && Object.keys(reportData).length === 0 && !isGenerating && (
                    <Typography sx={{textAlign: 'center', p: 4}}>Nessun dato trovato per i filtri selezionati.</Typography>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default MensileTecnici;
