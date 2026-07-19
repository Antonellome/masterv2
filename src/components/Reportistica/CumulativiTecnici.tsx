
import React, { useState, useCallback, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button, Autocomplete, CircularProgress, Checkbox,
    useTheme, Alert
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DataGrid, GridColDef, GridToolbarContainer, GridRowsProp } from '@mui/x-data-grid';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import isBetween from 'dayjs/plugin/isBetween';
import { db } from '@/db/db';
import { Tecnico, Nave, Ditta, Categoria } from '@/models/definitions';
import * as XLSX from 'xlsx';

dayjs.locale('it');
dayjs.extend(isBetween);

// --- FUNZIONI DI UTILITY (Clonate dalla fonte della verità: RicercaAvanzata.tsx) ---

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

// --- COMPONENTE PRINCIPALE ---
interface PivotGridRowData {
    id: string;
    tecnico: string;
    totaleOre: number;
    [day: string]: number | string;
}

const CumulativiTecnici: React.FC = () => {
    const theme = useTheme();
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs().year(2026).month(6));
    
    const [rows, setRows] = useState<GridRowsProp>([]);
    const [cols, setCols] = useState<GridColDef[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    
    const [options, setOptions] = useState<{ ditte: Ditta[], categorie: Categoria[], navi: Nave[], tecnici: Tecnico[] }>({ ditte: [], categorie: [], navi: [], tecnici: [] });
    const [selectedDitte, setSelectedDitte] = useState<Ditta[]>([]);
    const [selectedCategorie, setSelectedCategorie] = useState<Categoria[]>([]);
    const [selectedTecnici, setSelectedTecnici] = useState<Tecnico[]>([]);
    const [selectedNavi, setSelectedNavi] = useState<Nave[]>([]);

    useEffect(() => {
        const fetchAndCleanOptions = async () => {
            const [ditte, categorie, navi, tecnici] = await Promise.all([db.ditte.toArray(), db.categorie.toArray(), db.navi.toArray(), db.tecnici.toArray()]);
            const safeSort = (arr: any[], labelFn: (item: any) => string) => arr.filter(Boolean).sort((a, b) => labelFn(a).localeCompare(labelFn(b)));
            setOptions({ 
                ditte: safeSort(ditte.filter(i => i.nome), getGenericLabel),
                categorie: safeSort(categorie.filter(i => i.nome), getGenericLabel),
                navi: safeSort(navi.filter(i => i.nome), getGenericLabel),
                tecnici: safeSort(tecnici.filter(i => i.nome && i.cognome), getTecnicoLabel)
            });
        };
        fetchAndCleanOptions();
    }, []);

    useEffect(() => {
         setIsGenerated(false);
    }, [selectedDate, selectedDitte, selectedCategorie, selectedTecnici, selectedNavi]);

    const handleGeneraMatrice = async () => {
        setIsLoading(true);
        try {
            const startOfMonth = selectedDate.startOf('month');
            const endOfMonth = selectedDate.endOf('month');
            const giorniDelMese = selectedDate.daysInMonth();

            const allRapportini = await db.rapportini.toArray();
            const allTecnici = await db.tecnici.toArray();
            const tecniciMap = new Map(allTecnici.map(t => [getCleanId(t.id), t]));

            const rapportiniDelMese = allRapportini.filter(r => {
                const dataDaNormalizzare = (r as any).dataInizio || r.data;
                const dataNormalizzata = normalizeDate(dataDaNormalizzare);
                const dataRapportino = dayjs(dataNormalizzata);
                return dataRapportino.isValid() && dataRapportino.isBetween(startOfMonth, endOfMonth, null, '[]');
            });

            const ditteIds = selectedDitte.length > 0 ? new Set(selectedDitte.map(d => getCleanId(d.id))) : null;
            const naviIds = selectedNavi.length > 0 ? new Set(selectedNavi.map(n => getCleanId(n.id))) : null;
            const categorieIds = selectedCategorie.length > 0 ? new Set(selectedCategorie.map(c => getCleanId(c.id))) : null;

            const initialFilteredRapportini = rapportiniDelMese.filter(r => 
                (!ditteIds || ditteIds.has(getCleanId(r.dittaId))) &&
                (!naviIds || naviIds.has(getCleanId(r.naveId))) &&
                (!categorieIds || categorieIds.has(getCleanId(r.categoriaId)))
            );

            const allInvolvedTecnicoIds = new Set<string>();
            initialFilteredRapportini.forEach(r => {
                const addId = (id: any) => { const cleanId = getCleanId(id); if (cleanId) allInvolvedTecnicoIds.add(cleanId); };
                addId(r.tecnicoId);
                (r.dettaglioOreTecnici || []).forEach(d => addId(d.tecnicoId));
                (r.altriTecniciIds || []).forEach(id => addId(id));
                (r.presenze || []).forEach(id => addId(id));
            });

            const selectedTecniciIds = selectedTecnici.length > 0 ? new Set(selectedTecnici.map(t => getCleanId(t.id))) : null;
            const finalTecnicoIdsToShow = Array.from(allInvolvedTecnicoIds).filter(id => !selectedTecniciIds || selectedTecniciIds.has(id));

            const righeDaGenerare = new Map<string, PivotGridRowData>();
            for (const id of finalTecnicoIdsToShow) {
                if (id && tecniciMap.has(id)) {
                    const infoTecnico = tecniciMap.get(id)!;
                    const nuovaRiga: PivotGridRowData = { id, tecnico: getTecnicoLabel(infoTecnico), totaleOre: 0 };
                    for (let i = 1; i <= giorniDelMese; i++) { nuovaRiga[String(i)] = 0; }
                    righeDaGenerare.set(id, nuovaRiga);
                }
            }
            
            for (const r of initialFilteredRapportini) {
                const dataDaNormalizzare = (r as any).dataInizio || r.data;
                const giorno = dayjs(normalizeDate(dataDaNormalizzare)).date().toString();
                if (!giorno || giorno === 'NaN') continue;

                const isNewHybridModel = r.dettaglioOreTecnici && Array.isArray(r.dettaglioOreTecnici) && r.dettaglioOreTecnici.length > 0;

                if (isNewHybridModel) {
                    const techsWhoGotHours = new Set<string>();
                    r.dettaglioOreTecnici!.forEach(d => {
                        const cleanId = getCleanId(d.tecnicoId);
                        const oreNumeriche = d.ore ? parseFloat(String(d.ore).replace(',', '.')) : 0;
                        if (cleanId && righeDaGenerare.has(cleanId) && oreNumeriche > 0) {
                             const riga = righeDaGenerare.get(cleanId)!; (riga[giorno] as number) += oreNumeriche; techsWhoGotHours.add(cleanId);
                        }
                    });
                    const principaleId = getCleanId(r.tecnicoId);
                    if (principaleId && righeDaGenerare.has(principaleId) && !techsWhoGotHours.has(principaleId)) {
                        const orePrincipale = r.oreLavoro ? parseFloat(String(r.oreLavoro).replace(',', '.')) : 0;
                        if (orePrincipale > 0) { (righeDaGenerare.get(principaleId)![giorno] as number) += orePrincipale; }
                    }
                } else {
                    const monteOre = r.oreLavoro ? parseFloat(String(r.oreLavoro).replace(',', '.')) : 0;
                    if (monteOre > 0) {
                        const allLegacyTecnici = new Set<string>();
                        const addId = (id: any) => { const cleanId = getCleanId(id); if (cleanId) allLegacyTecnici.add(cleanId); };
                        addId(r.tecnicoId); (r.altriTecniciIds || []).forEach(addId); (r.presenze || []).forEach(addId);
                        const numeroTecnici = allLegacyTecnici.size;
                        if (numeroTecnici > 0) {
                            const orePerTecnico = monteOre / numeroTecnici;
                            allLegacyTecnici.forEach(tecnicoId => { if (righeDaGenerare.has(tecnicoId)) { (righeDaGenerare.get(tecnicoId)![giorno] as number) += orePerTecnico; } });
                        }
                    }
                }
            }
           
            const righeFinali = Array.from(righeDaGenerare.values());
            righeFinali.forEach(riga => { riga.totaleOre = Object.keys(riga).filter(key => !isNaN(parseInt(key))).reduce((acc, key) => acc + (riga[key] as number), 0); });

            const pivotCols: GridColDef[] = [ { field: 'tecnico', headerName: 'Tecnico', width: 200, frozen: true, cellClassName: 'tecnico-cell' } ];
            for (let i = 1; i <= giorniDelMese; i++) {
                const day = startOfMonth.date(i);
                pivotCols.push({ field: String(i), headerName: String(i), width: 65, align: 'center', headerAlign: 'center', type: 'number', cellClassName: (day.day() === 0 || day.day() === 6) ? 'weekend-cell' : '' });
            }
            pivotCols.push({ field: 'totaleOre', headerName: 'Totale Ore', width: 120, type: 'number', align: 'right', headerAlign: 'right', cellClassName: 'total-ore-cell' });
            
            setCols(pivotCols);
            setRows(righeFinali.filter(r => r.totaleOre > 0).sort((a, b) => a.tecnico.localeCompare(b.tecnico)));
            setIsGenerated(true);

        } catch (error) { console.error("ERRORE GLOBALE DURANTE LA GENERAZIONE:", error); }
        setIsLoading(false);
    };

    const handleExportToExcel = useCallback(() => {
        const dataToExport = rows.map(row => {
            const newRow: any = { Tecnico: row.tecnico };
            cols.slice(1, -1).forEach(col => { const value = row[col.field]; newRow[col.headerName!] = (typeof value === 'number' && value > 0) ? value : ''; });
            newRow['Totale Ore'] = row.totaleOre;
            return newRow;
        });
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Cumulativo_${selectedDate.format('MMMM_YYYY')}`);
        XLSX.writeFile(wb, `Cumulativo_${selectedDate.format('MMMM_YYYY')}.xlsx`);
    }, [cols, rows, selectedDate]);

    const CustomToolbar = () => (<GridToolbarContainer><Button color="primary" startIcon={<FileDownloadIcon />} onClick={handleExportToExcel} disabled={rows.length === 0}>Esporta Excel</Button></GridToolbarContainer>);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='it'>
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>Analisi Cumulativi</Typography>
                <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}><DatePicker label="Seleziona Mese" views={['month', 'year']} value={selectedDate} onChange={(d) => d && setSelectedDate(d)} slotProps={{ textField: { fullWidth: true } }} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Autocomplete multiple options={options.ditte} value={selectedDitte} onChange={(_,v) => setSelectedDitte(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={(o, v) => getCleanId(o.id) === getCleanId(v.id)} renderInput={(p) => <TextField {...p} label="Filtra Ditta" />} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Autocomplete multiple options={options.categorie} value={selectedCategorie} onChange={(_,v) => setSelectedCategorie(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={(o, v) => getCleanId(o.id) === getCleanId(v.id)} renderInput={(p) => <TextField {...p} label="Filtra Categoria" />} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Autocomplete multiple options={options.navi} value={selectedNavi} onChange={(_,v) => setSelectedNavi(v)} getOptionLabel={getGenericLabel} isOptionEqualToValue={(o, v) => getCleanId(o.id) === getCleanId(v.id)} renderInput={(p) => <TextField {...p} label="Filtra per Nave"/>} /></Grid>
                        <Grid item xs={12} sm={6} md={5}>
                             <Autocomplete multiple disableCloseOnSelect options={options.tecnici} value={selectedTecnici} onChange={(_, v) => setSelectedTecnici(v)} getOptionLabel={getTecnicoLabel} isOptionEqualToValue={(o, v) => getCleanId(o.id) === getCleanId(v.id)}
                                renderOption={(props, option, { selected }) => (<li {...props} key={getCleanId(option.id)}><Checkbox icon={<CheckBoxOutlineBlankIcon fontSize="small" />} checkedIcon={<CheckBoxIcon fontSize="small" />} checked={selected} />{getTecnicoLabel(option)}</li>)}
                                renderInput={(params) => <TextField {...params} label="Filtra Tecnici" />}
                            />
                        </Grid>
                        <Grid item xs={12} sm={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Button variant="contained" color="primary" size="large" onClick={handleGeneraMatrice} disabled={isLoading} sx={{ width: '100%' }}>{isLoading ? <CircularProgress size={24} color="inherit" /> : 'Genera Report'}</Button>
                        </Grid>
                    </Grid>
                </Paper>
                
                {(isGenerated && !isLoading && rows.length === 0) && <Alert severity="info">Nessun dato trovato per i filtri selezionati.</Alert>}
                
                {(isGenerated && rows.length > 0) && (
                    <Paper elevation={3} sx={{ p: { xs: 1, sm: 2 }, height: '70vh', width: '100%' }}>
                         <DataGrid rows={rows} columns={cols} density="compact" slots={{ toolbar: CustomToolbar }}
                            sx={{ 
                                '& .weekend-cell': { backgroundColor: theme.palette.mode === 'dark' ? theme.palette.action.hover : theme.palette.grey[200] },
                                '& .tecnico-cell': { fontWeight: 'bold' },
                                '& .total-ore-cell': { fontWeight: 'bold', backgroundColor: theme.palette.action.selected },
                                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                            }}
                         />
                    </Paper>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default CumulativiTecnici;
