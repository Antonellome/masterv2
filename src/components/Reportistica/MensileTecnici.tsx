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

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

// This wrapper is crucial. It prevents useLiveQuery from breaking if the db table object is not ready on the first render.
const safeQuery = <T,>(query: () => Promise<T[] | undefined> | undefined): () => Promise<T[] | any[]> => {
    return () => {
        try {
            // The query function itself might be undefined if db is not ready
            const promise = query?.();
            // The promise can be undefined if the table is not ready
            return promise || Promise.resolve([]);
        } catch (e) {
            // In case the query function throws an error
            console.error("SafeQuery caught an error:", e);
            return Promise.resolve([]);
        }
    };
};

const LegendaReport: React.FC = () => (
    <Box sx={{ mt: 2, p: 1, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, fontSize: '0.75rem' }}>
        <Typography variant="caption" display="block" gutterBottom><b>Legenda:</b></Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px'}}>
            <span><b>8</b>: Ore Ordinarie</span>
            <span><b>8+2</b>: Ordinarie + Straordinarie</span>
            <span><b>+2</b>: Solo Straordinarie</span>
            <span><b>5N</b>: Ore Notturne (Cartour)</span>
            <span><b>8F</b>: Ferie</span>
            <span><b>8M</b>: Malattia</span>
            <span><b>8P</b>: Permesso</span>
            <span><b>8FE</b>: Festività</span>
             <span><b>8L</b>: Legge 104</span>
        </Box>
    </Box>
);

const MensileTecnici: React.FC = () => {
    const theme = useTheme();
    const printRef = useRef<HTMLDivElement>(null);

    // --- UNIFIED & ROBUST DATA FETCHING via useLiveQuery --- 
    const allDitte = useLiveQuery(safeQuery(() => db.ditte?.toArray()), []);
    const allCategorie = useLiveQuery(safeQuery(() => db.categorieTecnici?.toArray()), []);
    const allTecnici = useLiveQuery(safeQuery(() => db.tecnici?.toArray()), []);
    const allNavi = useLiveQuery(safeQuery(() => db.navi?.toArray()), []);
    const allRapportini = useLiveQuery(safeQuery(() => db.rapportini?.toArray()), []);
    const allTipiGiornata = useLiveQuery(safeQuery(() => db.tipiGiornata?.toArray()), []);
    const impostazioni = useLiveQuery(() => db.impostazioni?.get(1), []);

    // Separate loading states, they are true only if data is not yet available.
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
            rapportini: allRapportini,
            tipiGiornata: allTipiGiornata,
            impostazioni: impostazioni as Impostazioni | undefined,
            navi: allNavi
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

    const handleNaviChange = (_: any, value: Nave[]) => {
        setSelectedNavi(value);
        setReportData(null);
    }

    const handleTecniciChange = (_: any, value: Tecnico[]) => {
        setSelectedTecnici(value);
        setReportData(null);
    }

    const getDittaStyle = (dittaId?: number) => {
        const ditta = ditteMap.get(dittaId ?? -1);
        if (ditta?.nome.toLowerCase().includes('tin')) {
            return { backgroundColor: theme.palette.grey[200] };
        }
        return {};
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Filtri Report</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                        <Autocomplete 
                            options={ditteOptions}
                            getOptionLabel={(option) => option?.nome || ''}
                            value={selectedDitta}
                            onChange={handleDittaChange}
                            renderInput={(params) => <TextField {...params} label="Ditta" />}
                            loading={ditteLoading}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                         <Autocomplete 
                            options={categorieOptions}
                            getOptionLabel={(option) => option?.nome || ''}
                            value={selectedCategoria}
                            onChange={handleCategoriaChange}
                            renderInput={(params) => <TextField {...params} label="Categoria" />}
                            loading={categorieLoading}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                        <DatePicker views={['month', 'year']} label="Mese Report" value={selectedMonth} onChange={(v) => { if (v) {setSelectedMonth(v); setReportData(null);}}} />
                    </Box>

                     <Autocomplete
                        multiple
                        options={naviOptions}
                        disableCloseOnSelect
                        getOptionLabel={(option) => option?.nome || ''}
                        value={selectedNavi}
                        onChange={handleNaviChange}
                        renderOption={(props, option, { selected }) => (
                            <li {...props} key={option.id}>
                                <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                                {option?.nome || 'Nome mancante'}
                            </li>
                        )}
                        renderInput={(params) => <TextField {...params} label="Filtra per Navi (opzionale)" />}
                        loading={naviLoading}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        sx={{ mb: 2 }}
                    />

                    <Autocomplete
                        multiple
                        options={filteredTecnici}
                        disableCloseOnSelect
                        getOptionLabel={(option) => `${option?.cognome || ''} ${option?.nome || ''}`.trim()}
                        value={selectedTecnici}
                        onChange={handleTecniciChange}
                        renderOption={(props, option, { selected }) => (
                             <li {...props} key={option.id}>
                                <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                                {`${option?.cognome || ''} ${option?.nome || ''}`.trim()}
                            </li>
                        )}
                        renderInput={(params) => <TextField {...params} label="Seleziona Tecnici" />}
                        loading={tecniciLoading}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                    />

                     <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
                         <Button onClick={() => setSelectedTecnici(filteredTecnici)} variant="text" disabled={filteredTecnici.length === 0}>Seleziona Tutti</Button>
                         <Button onClick={() => setSelectedTecnici([])} variant="text">Deseleziona Tutti</Button>
                        <Button variant="contained" onClick={handleGenerateReport} disabled={isGenerating || selectedTecnici.length === 0 || reportPrereqsLoading} startIcon={isGenerating ? <CircularProgress size={20} /> : null}>
                            {isGenerating ? 'Generando...' : 'Genera Report'}
                        </Button>
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
                                'table, tr, td, th': {
                                    border: '1px solid black !important',
                                    borderColor: 'black !important',
                                    fontSize: '9pt',
                                    padding: '2px 4px'
                                },
                                'th': {
                                    backgroundColor: '#f2f2f2',
                                }
                            }
                        }}>
                        {Object.entries(reportData).map(([naveId, naveData]) => (
                            <Box key={naveId} sx={{ mb: 4 }}>
                                <Typography variant="h5" gutterBottom component="div">{naveData.naveNome}</Typography>
                                <TableContainer component={Paper}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{position: 'sticky', left: 0, zIndex: 1, backgroundColor: 'background.paper' }}>Tecnico</TableCell>
                                                {giorniDelMese.map(giorno => <TableCell key={giorno} align="center">{giorno}</TableCell>)}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {naveData.tecnici
                                                .sort((a, b) => (ditteMap.get(a.dittaId!)?.nome || '').localeCompare(ditteMap.get(b.dittaId!)?.nome || '') || (a.cognome + a.nome).localeCompare(b.cognome + b.nome))
                                                .map(tecnico => (
                                                    <TableRow key={tecnico.id} sx={getDittaStyle(tecnico.dittaId)}>
                                                        <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, ...getDittaStyle(tecnico.dittaId) }}>
                                                            <Chip size="small" label={ditteMap.get(tecnico.dittaId!)?.sigla || ''} sx={{mr: 1}}/>
                                                            {tecnico.cognome} {tecnico.nome}
                                                        </TableCell>
                                                        {giorniDelMese.map(giorno => (
                                                            <TableCell key={`${tecnico.id}-${giorno}`} align="center">
                                                                {naveData.reportData[tecnico.id]?.[giorno] || ''}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        ))}
                        <LegendaReport />
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
