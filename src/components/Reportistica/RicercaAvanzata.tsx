
import React, { useState, useMemo, useCallback } from 'react';
import {
    Paper, Typography, Button, Box, TextField, Autocomplete, Grid,
    Snackbar, Alert, Tooltip, SvgIcon
} from '@mui/material';
import { DataGrid, GridToolbar, GridColDef, GridRowParams, GridActionsCellItem, GridSortComparator } from '@mui/x-data-grid';
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
import { functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { useGlobalStore } from '@/stores/globalStore';

const SignatureIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 10.72 9.94 9 12 9c2.65 0 4.8 2.15 4.8 4.8v.1l.33.94h1.54c1.48 0 2.73 1.13 2.87 2.6H19v-1.5h-1.14l-1-1H14v-3.26c0-.63-.51-1.14-1.14-1.14S11.72 13.11 11.72 13.74V17h-1.43v-3.26c0-.63-.51-1.14-1.14-1.14S8 13.11 8 13.74V17H6.28v-2.21L5.5 14H4v2h1v1h1v-1h1v-1h.28v-3.26c0-.63.51-1.14 1.14-1.14S11.72 13.11 11.72 13.74V17h1.14v-3.26c0-.63-.51-1.14 1.14-1.14S15.14 13.11 15.14 13.74V17h1.14v-1.14L17 15h1v2h1v1h-1v-1h-1v-1h-1v1h-1v1h-1v1h1v1h1v1h.86c1.73 0 3.14-1.41 3.14-3.14 0-1.62-1.25-2.95-2.86-3.04z"/>
    </SvgIcon>
);

dayjs.locale('it');

interface FlatRapportino {
    id: string;
    data: Date;
    dataFormatted: string;
    mainTecnicoNome: string;
    altriTecniciNomi: string[];
    tecnicoIds: string[];
    breveDescrizione: string; // Updated field name
    tipoGiornataNome: string;
    tipoGiornataId?: string | null;
    naveNome: string;
    naveId?: string | null;
    luogoNome: string;
    luogoId?: string | null;
    clienteNome: string;
    clienteId?: string | null;
    ordineLavoro?: string;
    oreTotali: string;
    hasFirma: boolean;
}

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

const calculateTotalHours = (details: any[] | undefined): number => {
    if (!Array.isArray(details)) return 0;
    return details.reduce((sum, d) => {
        const hours = parseFloat(d?.ore);
        return !isNaN(hours) ? sum + hours : sum;
    }, 0);
};

const dateSortComparator: GridSortComparator<Date> = (v1, v2) => new Date(v1).getTime() - new Date(v2).getTime();

const RicercaAvanzata: React.FC = () => {
    const navigate = useNavigate();
    
    const {
        rapportini, removeRapportino,
        tecnici, navi, clienti, luoghi, tipiGiornata,
        tecniciMap, naviMap, clientiMap, luoghiMap, tipiGiornataMap,
        areAnagraficheLoading
    } = useGlobalStore(state => state);

    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => a.nome.localeCompare(b.nome)), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => a.nome.localeCompare(b.nome)), [luoghi]);
    const sortedClienti = useMemo(() => [...clienti].sort((a, b) => a.nome.localeCompare(b.nome)), [clienti]);
    const sortedTipiGiornata = useMemo(() => [...tipiGiornata].sort((a, b) => a.nome.localeCompare(b.nome)), [tipiGiornata]);

    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' });
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);

    const flatRapportini = useMemo((): FlatRapportino[] => {
        if (!rapportini || !rapportini.length || areAnagraficheLoading) {
            return [];
        }

        return rapportini.map((r: Rapportino) => {
            const dataInizio = r.dataInizio instanceof Date ? r.dataInizio : new Date(r.dataInizio);

            const tecniciPresenti = (r.presenze || [])
                .map((id: string) => tecniciMap.get(id))
                .filter((t): t is Tecnico => !!t);

            const tecniciNomi = tecniciPresenti.map(t => `${t.cognome} ${t.nome}`.trim());

            if (tecniciNomi.length === 0 && r.tecnicoId) {
                const author = tecniciMap.get(r.tecnicoId);
                if (author) {
                    tecniciNomi.push(`${author.cognome} ${author.nome}`.trim());
                }
            }

            const mainTecnicoNome = tecniciNomi[0] || 'N/D';
            const altriTecniciNomi = tecniciNomi.slice(1);
            const tecnicoIds = tecniciPresenti.map(t => t.id);

            const nave = r.naveId ? naviMap.get(r.naveId) : undefined;
            const luogo = r.luogoId ? luoghiMap.get(r.luogoId) : undefined;
            const clienteId = nave?.clienteId || luogo?.clienteId;
            const cliente = clienteId ? clientiMap.get(clienteId) : undefined;
            const tipoGiornata = r.tipoGiornataId ? tipiGiornataMap.get(r.tipoGiornataId) : undefined;

            return {
                id: r.id!,
                data: dataInizio,
                dataFormatted: dayjs(dataInizio).isValid() ? dayjs(dataInizio).format("DD/MM/YYYY") : "Data Invalida",
                mainTecnicoNome,
                altriTecniciNomi,
                tecnicoIds,
                breveDescrizione: r.descrizioneBreve || r.lavoroEseguito || '', // <-- Usa `descrizioneBreve` con fallback a `lavoroEseguito`
                tipoGiornataNome: tipoGiornata?.nome || "N/D",
                tipoGiornataId: r.tipoGiornataId,
                naveNome: nave?.nome || "N/D",
                naveId: r.naveId,
                luogoNome: luogo?.nome || "N/D",
                luogoId: r.luogoId,
                clienteNome: cliente?.nome || "N/D",
                clienteId: cliente?.id,
                ordineLavoro: r.ordineLavoro,
                oreTotali: formatOreLavoro(calculateTotalHours(r.dettaglioOre)),
                hasFirma: !!r.firmaVettoriale,
            };
        });
    }, [rapportini, areAnagraficheLoading, naviMap, clientiMap, luoghiMap, tecniciMap, tipiGiornataMap]);

    const filteredRapportini = useMemo(() => {
        return flatRapportini.filter(r => {
           if (filters.dataDa && dayjs(r.data).isBefore(filters.dataDa, 'day')) return false;
           if (filters.dataA && dayjs(r.data).isAfter(filters.dataA, 'day')) return false;
           if (filters.tecnico && !r.tecnicoIds.includes(filters.tecnico.id)) return false;
           if (filters.nave && r.naveId !== filters.nave.id) return false;
           if (filters.cliente && r.clienteId !== filters.cliente.id) return false;
           if (filters.tipoGiornata && r.tipoGiornataId !== filters.tipoGiornata.id) return false;
           if (filters.luogo && r.luogoId !== filters.luogo.id) return false;
           if (filters.ordineLavoro && !(r.ordineLavoro || '').toLowerCase().includes(filters.ordineLavoro.toLowerCase())) return false;
           return true;
       });
   }, [flatRapportini, filters]);

    const handleDeleteRequest = useCallback((id: string) => setRowToDelete(id), []);
    
    const handleConfirmDelete = async () => {
        if (!rowToDelete) return;
        const id = rowToDelete;
        setRowToDelete(null);
        try {
            const deleteRapportinoFunc = httpsCallable(functions, 'deleteRapportino');
            await deleteRapportinoFunc({ rapportinoId: id });
            removeRapportino(id);
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

    const columns: GridColDef<FlatRapportino>[] = useMemo(() => [
        { field: 'data', headerName: 'Data', width: 110, renderCell: (params) => params.row.dataFormatted, sortComparator: dateSortComparator, type: 'date' },
        { 
            field: 'tecnici', headerName: 'Tecnici', flex: 1.5, minWidth: 150, 
            renderCell: params => {
                const mainTecnico = params.row.mainTecnicoNome;
                const altriTecnici = params.row.altriTecniciNomi;
                const fullList = [mainTecnico, ...altriTecnici].join(', ');
                const numAltri = altriTecnici.length;
                return (
                    <Tooltip title={fullList} arrow placement="top">
                        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>{mainTecnico}</Typography>
                            {numAltri > 0 && (
                                <Typography variant="body2" component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>(+{numAltri})</Typography>
                            )}
                        </Box>
                    </Tooltip>
                );
            }
        },
        { 
            field: 'breveDescrizione', 
            headerName: 'Breve Descrizione', // <-- TITOLO CORRETTO
            flex: 2, 
            minWidth: 200,
            renderCell: params => (
                <Tooltip title={params.value || ''} arrow placement="top">
                    <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {params.value}
                    </Box>
                </Tooltip>
            )
        },
        { field: 'tipoGiornataNome', headerName: 'Tipo Giornata', flex: 1 },
        { field: 'ordineLavoro', headerName: 'Ordine Lavoro', flex: 1 },
        { field: 'naveNome', headerName: 'Nave', flex: 1 },
        { field: 'luogoNome', headerName: 'Luogo', flex: 1 },
        { field: 'clienteNome', headerName: 'Cliente', flex: 1 },
        { field: 'oreTotali', headerName: 'Ore Totali', width: 100, align: 'right', headerAlign: 'right' },
        { 
            field: 'hasFirma', 
            headerName: 'Firma', 
            width: 70, 
            align: 'center', 
            headerAlign: 'center',
            sortable: false,
            disableColumnMenu: true,
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
    ], [handleEdit, handleDeleteRequest]);
    
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 }, gap: 2 }}>
                <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Filtri Ricerca</Typography>
                     <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedNavi} getOptionLabel={(o) => o.nome} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedLuoghi} getOptionLabel={(o) => o.nome} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedClienti} getOptionLabel={(o) => o.nome} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedTipiGiornata} getOptionLabel={(o) => o.nome} value={filters.tipoGiornata} onChange={(_, v) => handleFilterChange('tipoGiornata', v)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><TextField label="Ordine di Lavoro" value={filters.ordineLavoro} onChange={e => handleFilterChange('ordineLavoro', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={12}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera Filtri</Button></Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <DataGrid 
                        rows={filteredRapportini} 
                        columns={columns} 
                        loading={areAnagraficheLoading} 
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
