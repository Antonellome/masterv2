
import React, { useState, useMemo, useCallback } from 'react';
import {
    Paper, Typography, Button, Box, TextField, Autocomplete, Grid,
    Snackbar, Alert, Tooltip, SvgIcon, CircularProgress
} from '@mui/material';
import { DataGrid, GridToolbar, GridColDef, GridRowParams, GridActionsCellItem } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';

import { db } from '@/db/database';
import { formatOreLavoro } from '@/utils/formatters';
import { Anagrafica, Nave, Cliente, Luogo, TipoGiornata, Rapportino } from '@/models/definitions';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { useGlobalStore } from '@/stores/globalStore';
import { calculateTotalHours } from '@/utils/hoursCalculator';

import ConfirmationDialog from '@/components/ConfirmationDialog';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';

dayjs.locale('it');

const robustParseToDayjs = (date: any): Dayjs | null => {
    if (!date) return null;
    if (typeof date.seconds === 'number') return dayjs(new Date(date.seconds * 1000));
    if (typeof date.toDate === 'function') return dayjs(date.toDate());
    const d = dayjs(date);
    return d.isValid() ? d : null;
};

const SignatureIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 10.72 9.94 9 12 9c2.65 0 4.8 2.15 4.8 4.8v.1l.33.94h1.54c1.48 0 2.73 1.13 2.87 2.6H19v-1.5h-1.14l-1-1H14v-3.26c0-.63-.51-1.14-1.14-1.14S11.72 13.11 11.72 13.74V17h-1.43v-3.26c0-.63-.51-1.14-1.14-1.14S8 13.11 8 13.74V17H6.28v-2.21L5.5 14H4v2h1v1h1v-1h1v-1h.28v-3.26c0-.63-.51-1.14 1.14-1.14S11.72 13.11 11.72 13.74V17h1.14v-3.26c0-.63-.51-1.14 1.14-1.14S15.14 13.11 15.14 13.74V17h1.14v-1.14L17 15h1v2h1v1h-1v-1h-1v-1h-1v1h-1v1h-1v1h1v1h1v1h.86c1.73 0 3.14-1.41 3.14-3.14 0-1.62-1.25-2.95-2.86-3.04z" />
    </SvgIcon>
);

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnico: Anagrafica | null;
    nave: Nave | null;
    cliente: Cliente | null;
    luogo: Luogo | null;
    tipoGiornata: TipoGiornata | null;
    ordineLavoro: string;
}

const safeSort = (a: any, b: any, field: string) => (a?.[field] || '').localeCompare(b?.[field] || '');
const safeSortCognomeNome = (a: any, b: any) => `${a?.cognome || ''} ${a?.nome || ''}`.localeCompare(`${b?.cognome || ''} ${b?.nome || ''}`);

const RicercaAvanzata: React.FC = () => {
    const navigate = useNavigate();
    const isSyncing = useGlobalStore(state => state.isSyncing);

    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const navi = useLiveQuery(() => db.navi.toArray(), []);
    const luoghi = useLiveQuery(() => db.luoghi.toArray(), []);
    const clienti = useLiveQuery(() => db.clienti.toArray(), []);
    const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);
    const allRapportiniRaw = useLiveQuery(() => db.rapportini.toArray(), []);

    const isLoading = !allRapportiniRaw || !tecnici || !navi || !luoghi || !clienti || !tipiGiornata || isSyncing;

    const rapportini = useMemo(() => {
        if (isLoading || !allRapportiniRaw) return [];
        return allRapportiniRaw
            .filter(r => r && r.id && !r.isDeleted)
            .map(r => ({
                ...r,
                data: robustParseToDayjs(r.data)?.toDate() ?? null,
            }));
    }, [allRapportiniRaw, isLoading]);

    const { tecniciMap, naviMap, luoghiMap, clientiMap, tipiGiornataMap } = useMemo(() => ({
        tecniciMap: new Map((tecnici || []).map(t => [t.id, t])),
        naviMap: new Map((navi || []).map(n => [n.id, n])),
        luoghiMap: new Map((luoghi || []).map(l => [l.id, l])),
        clientiMap: new Map((clienti || []).map(c => [c.id, c])),
        tipiGiornataMap: new Map((tipiGiornata || []).map(t => [t.id, t]))
    }), [tecnici, navi, luoghi, clienti, tipiGiornata]);

    const sortedTecnici = useMemo(() => [...(tecnici || [])].sort(safeSortCognomeNome), [tecnici]);
    const sortedNavi = useMemo(() => [...(navi || [])].sort((a,b) => safeSort(a,b, 'nome')), [navi]);
    const sortedLuoghi = useMemo(() => [...(luoghi || [])].sort((a,b) => safeSort(a,b, 'nome')), [luoghi]);
    const sortedClienti = useMemo(() => [...(clienti || [])].sort((a,b) => safeSort(a,b, 'nome')), [clienti]);
    const sortedTipiGiornata = useMemo(() => [...(tipiGiornata || [])].sort((a,b) => safeSort(a,b, 'nome')), [tipiGiornata]);

    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' });
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    const filteredRapportini = useMemo(() => {
        if (isLoading || !rapportini) return [];
        return rapportini.filter(r => {
            const dataRapportino = r.data ? dayjs(r.data) : null;
            if (filters.dataDa && dataRapportino && dataRapportino.isBefore(filters.dataDa, 'day')) return false;
            if (filters.dataA && dataRapportino && dataRapportino.isAfter(filters.dataA, 'day')) return false;
            if (filters.nave && r.naveId !== filters.nave.id) return false;
            if (filters.luogo && r.luogoId !== filters.luogo.id) return false;
            if (filters.tipoGiornata && r.tipoGiornataId !== filters.tipoGiornata.id) return false;
            if (filters.ordineLavoro && !(r.ordineLavoro || '').toLowerCase().includes(filters.ordineLavoro.toLowerCase())) return false;
            if (filters.cliente) {
                const nave = naviMap.get(r.naveId || '');
                const luogo = luoghiMap.get(r.luogoId || '');
                const clienteId = nave?.clienteId || luogo?.clienteId;
                if (clienteId !== filters.cliente.id) return false;
            }
            if (filters.tecnico) {
                const tecnicoId = filters.tecnico.id;
                const match = 
                    r.tecnicoId === tecnicoId ||
                    r.presenze?.includes(tecnicoId) ||
                    r.dettaglioOreTecnici?.some(d => d.tecnicoId === tecnicoId);
                
                if (!match) return false;
            }
            return true;
        });
    }, [rapportini, filters, naviMap, luoghiMap, isLoading]);

    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);
    const handleDeleteRequest = useCallback((id: string) => setRowToDelete(id), []);

    const handleConfirmDelete = async () => {
        if (!rowToDelete) return;
        const id = rowToDelete;
        setRowToDelete(null);
        try {
            await rapportinoCloudService.delete(id);
            useGlobalStore.getState().syncCollectionByName('rapportini');
            setSnackbar({ open: true, message: 'Rapportino archiviato.', severity: 'success' });
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || "Errore.", severity: 'error' });
        }
    };

    const handleRowClick = (params: GridRowParams) => {
        if (params.field === 'actions' || params.field === '__check__') return;
        navigate(`/rapportino/edit/${params.id}`);
    };

    const handleFilterChange = useCallback(<K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const resetFilters = useCallback(() => setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' }), []);

    const columns: GridColDef<(typeof rapportini)[0]>[] = useMemo(() => [
        { 
            field: 'data', 
            headerName: 'Data', 
            width: 110, 
            type: 'date',
            renderCell: (p) => p.value ? dayjs(p.value).format("DD/MM/YYYY") : '' 
        },
        {
            field: 'tecnici',
            headerName: 'Tecnici',
            flex: 1.5, 
            minWidth: 150,
            valueGetter: (p) => {
                if (!p?.row) return '';
                const allIds = [...new Set([
                    p.row.tecnicoScriventeId,
                    p.row.tecnicoId,
                    ...(p.row.presenze || []),
                    ...(p.row.dettaglioOreTecnici?.map(d => d.tecnicoId) || [])
                ])].filter(Boolean);
                return allIds.map(id => {
                    const t = tecniciMap.get(id);
                    return t ? `${t.cognome} ${t.nome}` : '';
                }).filter(Boolean).join(', ');
            },
            renderCell: (p) => {
                if (!p.row) return null;
                const authorId = p.row.tecnicoScriventeId || p.row.tecnicoId;
                const author = authorId ? tecniciMap.get(authorId) : null;
                const authorName = author ? `${author.cognome} ${author.nome}` : 'N/D';
                const allPresentIds = [...new Set([
                    p.row.tecnicoScriventeId,
                    p.row.tecnicoId,
                    ...(p.row.presenze || []),
                    ...(p.row.dettaglioOreTecnici?.map(d => d.tecnicoId) || [])
                ])].filter(Boolean);
                const allNamesString = allPresentIds.map(id => {
                    const t = tecniciMap.get(id);
                    return t ? `${t.cognome} ${t.nome}` : null;
                }).filter(Boolean).join(', ');
                const tooltipText = allNamesString ? `Tecnici presenti: ${allNamesString}` : 'Nessun tecnico specificato';
                return (
                    <Tooltip title={tooltipText} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {authorName}
                        </Box>
                    </Tooltip>
                );
            }
        },
        {
            field: 'descrizioneBreve', 
            headerName: 'Breve Descrizione', 
            flex: 2, 
            minWidth: 200,
            renderCell: (params) => {
                const description = params.row.descrizioneBreve as string;
                if (!description) {
                    return <span style={{ color: '#9e9e9e' }}>—</span>;
                }
                return (
                    <Tooltip title={description} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {description}
                        </Box>
                    </Tooltip>
                );
            }
        },
        { 
            field: 'tipoGiornataId', 
            headerName: 'Tipo Giornata', 
            flex: 1, 
            valueGetter: (p) => tipiGiornataMap.get(p?.row?.tipoGiornataId)?.nome || '-' 
        },
        {
             field: 'ordineLavoro', 
             headerName: 'Ordine Lavoro', 
             flex: 1, 
             valueGetter: (p) => p?.row?.ordineLavoro || '-' 
        },
        { 
            field: 'naveId', 
            headerName: 'Nave', 
            flex: 1, 
            valueGetter: (p) => naviMap.get(p?.row?.naveId)?.nome || '-' 
        },
        { 
            field: 'luogoId', 
            headerName: 'Luogo', 
            flex: 1, 
            valueGetter: (p) => luoghiMap.get(p?.row?.luogoId)?.nome || '-' 
        },
        { 
            field: 'clienteId', 
            headerName: 'Cliente', 
            flex: 1,
            valueGetter: (p) => {
                if (!p?.row) return '-';
                const nave = naviMap.get(p.row.naveId);
                const luogo = luoghiMap.get(p.row.luogoId);
                const clienteId = nave?.clienteId || luogo?.clienteId;
                return clienteId ? (clientiMap.get(clienteId)?.nome || 'N/D') : '-';
            }
        },
        { 
            field: 'oreTotali', 
            headerName: 'Ore Totali', 
            width: 100, 
            align: 'right', 
            headerAlign: 'right', 
            valueGetter: (p) => p?.row ? calculateTotalHours(p.row as Rapportino) : 0, 
            renderCell: p => formatOreLavoro(p.value)
        },
        { 
            field: 'hasFirma', 
            headerName: 'Firma', 
            width: 70, 
            align: 'center', 
            headerAlign: 'center', 
            sortable: false, 
            disableColumnMenu: true, 
            valueGetter: (p) => !!p?.row?.firmaVettoriale, 
            renderCell: (p) => <Tooltip title={p.value ? "Firmato" : "Non Firmato"}><span><SignatureIcon color={p.value ? 'success' : 'disabled'}/></span></Tooltip> 
        },
        { 
            field: 'actions', 
            type: 'actions', 
            headerName: 'Azioni', 
            width: 120, 
            getActions: ({ id }) => [
                <GridActionsCellItem icon={<EditIcon/>} label="Modifica" onClick={() => handleEdit(id as string)} showInMenu/>, 
                <GridActionsCellItem icon={<PrintIcon/>} label="Stampa/PDF" onClick={()=>{}} showInMenu/>, 
                <GridActionsCellItem icon={<DeleteIcon color="error"/>} label="Archivia" onClick={() => handleDeleteRequest(id as string)} showInMenu/>
            ] 
        },
    ], [handleEdit, handleDeleteRequest, tecniciMap, tipiGiornataMap, naviMap, luoghiMap, clientiMap]);
    
    const getOptionLabel = (option: any, field = 'nome') => {
        if (typeof option === 'string') return option;
        if (!option) return '';
        if (field === 'cognome_nome') return `${option.cognome || ''} ${option.nome || ''}`.trim();
        return option[field] || '';
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 }, gap: 2 }}>
                <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Filtri Ricerca</Typography>
                     <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedTecnici} getOptionLabel={(o) => getOptionLabel(o, 'cognome_nome')} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedNavi} getOptionLabel={(o) => getOptionLabel(o)} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedLuoghi} getOptionLabel={(o) => getOptionLabel(o)} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedClienti} getOptionLabel={(o) => getOptionLabel(o)} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedTipiGiornata} getOptionLabel={(o) => getOptionLabel(o)} value={filters.tipoGiornata} onChange={(_, v) => handleFilterChange('tipoGiornata', v)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><TextField label="Ordine di Lavoro" value={filters.ordineLavoro} onChange={e => handleFilterChange('ordineLavoro', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={12}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera Filtri</Button></Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <DataGrid 
                            rows={filteredRapportini} 
                            columns={columns} 
                            localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
                            slots={{ toolbar: GridToolbar }} 
                            slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }} 
                            initialState={{ 
                                pagination: { paginationModel: { pageSize: 100 } }, 
                                sorting: { sortModel: [{ field: 'data', sort: 'desc' }] } 
                            }} 
                            pageSizeOptions={[25, 50, 100, 200]} 
                            density="compact" 
                            onRowClick={handleRowClick} 
                            sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' } }} 
                        />
                    )}
                </Paper>
                
                <ConfirmationDialog open={!!rowToDelete} onClose={() => setRowToDelete(null)} onConfirm={handleConfirmDelete} title="Conferma Archiviazione" description={"Sei sicuro di voler archiviare questo rapportino?"} />
                {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
            </Box>
        </LocalizationProvider>
    );
};

export default RicercaAvanzata;
