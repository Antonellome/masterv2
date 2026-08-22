
import React, { useState, useMemo, useCallback } from 'react';
import {
    Paper, Typography, Button, Box, TextField, Autocomplete, Grid,
    Snackbar, Alert, Tooltip, SvgIcon
} from '@mui/material';
import { DataGrid, GridToolbar, GridColDef, GridRowParams, GridActionsCellItem } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { formatOreLavoro } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import { Tecnico, Nave, Cliente, Luogo, TipoGiornata, Rapportino } from '@/models/definitions';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { parseToDayjs } from '@/utils/dateUtils';

const SignatureIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 10.72 9.94 9 12 9c2.65 0 4.8 2.15 4.8 4.8v.1l.33.94h1.54c1.48 0 2.73 1.13 2.87 2.6H19v-1.5h-1.14l-1-1H14v-3.26c0-.63-.51-1.14-1.14-1.14S11.72 13.11 11.72 13.74V17h-1.43v-3.26c0-.63-.51-1.14-1.14-1.14S8 13.11 8 13.74V17H6.28v-2.21L5.5 14H4v2h1v1h1v-1h1v-1h.28v-3.26c0-.63.51-1.14 1.14-1.14S11.72 13.11 11.72 13.74V17h1.14v-3.26c0-.63-.51-1.14 1.14-1.14S15.14 13.11 15.14 13.74V17h1.14v-1.14L17 15h1v2h1v1h-1v-1h-1v-1h-1v1h-1v1h-1v1h1v1h1v1h.86c1.73 0 3.14-1.41 3.14-3.14 0-1.62-1.25-2.95-2.86-3.04z"/>
    </SvgIcon>
);

dayjs.locale('it');

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnico: Tecnico | null;
    nave: Nave | null;
    cliente: Cliente | null;
    luogo: Luogo | null;
    tipoGiornata: TipoGiornata | null;
    ordineLavoro: string;
}

// Placeholder for the unimplemented removeRapportino from the store
const useSafeRapportiniStore = () => {
    const store = useRapportiniStore();
    const removeRapportino = (id: string) => {
        // This is a dummy implementation. The real implementation should be in the store.
        console.warn(`removeRapportino called with ${id}, but it's not implemented in the store yet.`);
    };
    return { ...store, removeRapportino };
};


const RicercaAvanzata: React.FC = () => {
    const navigate = useNavigate();
    
    const {
        rapportini,
        tecnici, navi, clienti, luoghi, tipiGiornata,
        tecniciMap, naviMap, clientiMap, luoghiMap, tipiGiornataMap,
        loading,
        removeRapportino // This is now the safe dummy function
    } = useSafeRapportiniStore();

    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => a.nome.localeCompare(b.nome)), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => a.nome.localeCompare(b.nome)), [luoghi]);
    const sortedClienti = useMemo(() => [...clienti].sort((a, b) => a.nome.localeCompare(b.nome)), [clienti]);
    const sortedTipiGiornata = useMemo(() => [...tipiGiornata].sort((a, b) => a.nome.localeCompare(b.nome)), [tipiGiornata]);

    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' });
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);

    const filteredRapportini = useMemo(() => {
        return rapportini.filter(r => {
           if (!r) return false; // Defensive check
           const dataRapportino = parseToDayjs(r.data);
           if (filters.dataDa && dataRapportino && dataRapportino.isBefore(filters.dataDa, 'day')) return false;
           if (filters.dataA && dataRapportino && dataRapportino.isAfter(filters.dataA, 'day')) return false;
           if (filters.tecnico && !r.presenze?.includes(filters.tecnico.id)) return false;
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

           return true;
       });
   }, [rapportini, filters, naviMap, luoghiMap]);

    const handleDeleteRequest = useCallback((id: string) => setRowToDelete(id), []);
    
    const handleConfirmDelete = async () => {
        if (!rowToDelete) return;
        const id = rowToDelete;
        setRowToDelete(null);
        try {
            await rapportinoCloudService.delete(id);
            removeRapportino(id); // Calls the dummy function
            setSnackbar({ open: true, message: 'Rapportino eliminato con successo.', severity: 'success' });
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || "Errore durante l'eliminazione.", severity: 'error' });
        }
    };
    
    const handleRowClick = (params: GridRowParams) => {
        if (params.field === 'actions' || params.field === 'hasFirma') return;
        navigate(`/rapportino/edit/${params.id}`);
    };

    const handleFilterChange = useCallback(<K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const resetFilters = useCallback(() => setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' }), []);

    // *** THE FINAL FIX (R.7) - DEFENSIVE COLUMN DEFINITIONS ***
    const columns: GridColDef<Rapportino>[] = useMemo(() => [
        { 
            field: 'data', 
            headerName: 'Data', 
            width: 110, 
            valueGetter: params => parseToDayjs(params.row?.data)?.toDate(),
            renderCell: params => parseToDayjs(params.row?.data)?.format("DD/MM/YYYY") ?? "--",
            type: 'date' 
        },
        { 
            field: 'tecnici', 
            headerName: 'Tecnici', 
            flex: 1.5, minWidth: 150, 
            valueGetter: params => params.row?.presenze?.map(id => tecniciMap.get(id)?.nome).join(', ') ?? '',
            renderCell: params => {
                if (!params.row) return null;
                const mainTecnico = tecniciMap.get(params.row.tecnicoId);
                const altriTecniciCount = (params.row.presenze || []).filter(id => id !== params.row.tecnicoId).length;
                const fullList = (params.row.presenze || []).map(id => tecniciMap.get(id)?.nome).join(', ');
                return (
                    <Tooltip title={fullList} arrow placement="top">
                        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>{mainTecnico?.nome || 'N/A'}</Typography>
                            {altriTecniciCount > 0 && (
                                <Typography variant="body2" component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>(+{altriTecniciCount})</Typography>
                            )}
                        </Box>
                    </Tooltip>
                );
            }
        },
        {
            field: 'lavoroEseguito',
            headerName: 'Breve Descrizione',
            flex: 2, 
            minWidth: 200,
            valueGetter: params => params.row?.lavoroEseguito || '',
            renderCell: params => (
                <Tooltip title={params.value || ''} arrow placement="top">
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {params.value}
                    </Box>
                </Tooltip>
            )
        },
        { field: 'tipoGiornataNome', headerName: 'Tipo Giornata', flex: 1, valueGetter: params => tipiGiornataMap.get(params.row?.tipoGiornataId || '')?.nome || ''},
        { field: 'ordineLavoro', headerName: 'Ordine Lavoro', flex: 1, valueGetter: params => params.row?.ordineLavoro || '' },
        { field: 'naveNome', headerName: 'Nave', flex: 1, valueGetter: params => naviMap.get(params.row?.naveId || '')?.nome || ''},
        { field: 'luogoNome', headerName: 'Luogo', flex: 1, valueGetter: params => luoghiMap.get(params.row?.luogoId || '')?.nome || ''},
        { field: 'clienteNome', headerName: 'Cliente', flex: 1, valueGetter: params => {
            if (!params.row) return '';
            const nave = naviMap.get(params.row.naveId || '');
            const luogo = luoghiMap.get(params.row.luogoId || '');
            const clienteId = nave?.clienteId || luogo?.clienteId;
            return clienteId ? clientiMap.get(clienteId)?.nome || '' : '';
        }},
        { 
            field: 'oreTotali', 
            headerName: 'Ore Totali', 
            width: 100, align: 'right', headerAlign: 'right',
            valueGetter: params => (params.row?.dettaglioOreTecnici || []).reduce((sum, d) => sum + (d.ore || 0), 0),
            renderCell: params => formatOreLavoro(params.value)
        },
        { 
            field: 'hasFirma', 
            headerName: 'Firma', 
            width: 70, 
            align: 'center', 
            headerAlign: 'center',
            sortable: false,
            disableColumnMenu: true,
            valueGetter: params => !!params.row?.firmaVettoriale,
            renderCell: (params) => (
                <Tooltip title={params.value ? "Firmato" : "Non Firmato"}>
                    <span>
                        <SignatureIcon color={params.value ? 'success' : 'disabled'} />
                    </span>
                </Tooltip>
            )
        },
        {
            field: 'actions', type: 'actions', headerName: 'Azioni', width: 120,
            getActions: ({ id }) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={(e) => { e.stopPropagation(); handleEdit(id as string);}} showInMenu />, 
                <GridActionsCellItem icon={<PrintIcon />} label="Stampa/PDF" onClick={(e) => e.stopPropagation() } showInMenu />, 
                <GridActionsCellItem icon={<DeleteIcon color="error" />} label="Elimina" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(id as string);}} showInMenu />,
            ],
        },
    ], [handleEdit, handleDeleteRequest, tecniciMap, tipiGiornataMap, naviMap, luoghiMap, clientiMap]);
    
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 }, gap: 2 }}>
                <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Filtri Ricerca</Typography>
                     <Grid container spacing={2} alignItems="center">
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={sortedTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={sortedNavi} getOptionLabel={(o) => o.nome} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={sortedLuoghi} getOptionLabel={(o) => o.nome} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={sortedClienti} getOptionLabel={(o) => o.nome} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={sortedTipiGiornata} getOptionLabel={(o) => o.nome} value={filters.tipoGiornata} onChange={(_, v) => handleFilterChange('tipoGiornata', v)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" size="small" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><TextField label="Ordine di Lavoro" value={filters.ordineLavoro} onChange={e => handleFilterChange('ordineLavoro', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid size={12}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera Filtri</Button></Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <DataGrid 
                        rows={filteredRapportini} 
                        columns={columns} 
                        loading={loading} 
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
                        slots={{ toolbar: GridToolbar }} 
                        slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }} 
                        initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'data', sort: 'desc' }] } }} 
                        pageSizeOptions={[10, 25, 50, 100]} 
                        density="compact" 
                        onRowClick={handleRowClick}
                        sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' }, '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' } }}
                    />
                </Paper>
                
                <ConfirmationDialog open={!!rowToDelete} onClose={() => setRowToDelete(null)} onConfirm={handleConfirmDelete} title="Conferma Eliminazione" description={"Sei sicuro di voler eliminare questo rapportino? L'azione è irreversibile."} />
                
                {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
            </Box>
        </LocalizationProvider>
    );
};

export default RicercaAvanzata;
