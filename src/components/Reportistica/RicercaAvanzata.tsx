
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { doc, deleteDoc, Timestamp, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Paper, Typography, Button, CircularProgress, Box, TextField, Autocomplete, Grid,
    Snackbar, Alert, Chip
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
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useData } from '@/hooks/useData';
import { Tecnico, Nave, Cliente, Luogo, TipoGiornata, Rapportino } from '@/models/definitions';

dayjs.locale('it');

// --- INTERFACCE ---
interface FlatRapportino {
    id: string;
    dataFormatted: string;
    tecniciNomi: string[];
    tipoGiornataNome: string;
    naveNome: string;
    luogoNome: string;
    clienteNome: string;
    ore: string;
    data: Date | null;
    tecnicoIds: string[];
    naveId?: string | null;
    clienteId?: string | null;
    tipoGiornataId?: string | null;
    luogoId?: string | null;
}

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnico: Tecnico | null;
    nave: Nave | null;
    cliente: Cliente | null;
    luogo: Luogo | null;
    tipoGiornata: TipoGiornata | null;
}

// --- COMPONENTE PRINCIPALE ---
const RicercaAvanzata: React.FC = () => {
    const navigate = useNavigate();
    const { tipiGiornata, tecnici, clienti, navi, luoghi, loading: anagraficheLoading, error: anagraficheError } = useData();
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [rapportiniLoading, setRapportiniLoading] = useState(true);
    const [rapportiniError, setRapportiniError] = useState<string | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'rapportini'), snapshot => {
            const rapportiniData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
            setRapportini(rapportiniData);
            setRapportiniLoading(false);
        }, err => {
            console.error("Errore caricamento rapportini:", err);
            setRapportiniError("Errore nel caricamento dei rapportini.");
            setRapportiniLoading(false);
        });

        return () => unsub();
    }, []);


    // Hooks chiamati sempre e nello stesso ordine
    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null });
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    const flatRapportini = useMemo((): FlatRapportino[] => {
        const tecniciMap = new Map(tecnici.map((t) => [t.id, t]));
        const naviMap = new Map(navi.map((n) => [n.id, n]));
        const clientiMap = new Map(clienti.map((c) => [c.id, c]));
        const tipiGiornataMap = new Map(tipiGiornata.map((tg) => [tg.id, tg]));
        const luoghiMap = new Map(luoghi.map((l) => [l.id, l]));

        return rapportini.map((rapportino) => {
            const tecnicoIds = rapportino.presenze || [];
            const tecniciNomi = tecnicoIds.map(id => {
                const t = tecniciMap.get(id);
                return t ? `${t.cognome} ${t.nome}`.trim() : `ID Sconosciuto: ${id}`;
            });

            const tipoGiornataObj = rapportino.tipoGiornataId ? tipiGiornataMap.get(rapportino.tipoGiornataId) : null;
            const tipoGiornataNome = tipoGiornataObj?.nome || "N/D";
            
            const naveObj = rapportino.naveId ? naviMap.get(rapportino.naveId) : null;
            const naveNome = naveObj?.nome || "N/D";

            const luogoObj = rapportino.luogoId ? luoghiMap.get(rapportino.luogoId) : null;
            const luogoNome = luogoObj?.nome || "N/D";
            
            const clienteId = naveObj?.clienteId;
            const clienteObj = clienteId ? clientiMap.get(clienteId) : null;
            const clienteNome = clienteObj?.nome || "N/D";
            
            const ore = formatOreLavoro(rapportino.oreLavoro ?? 0);

            return {
                id: rapportino.id,
                dataFormatted: rapportino.data instanceof Timestamp ? dayjs(rapportino.data.toDate()).format("DD/MM/YYYY") : "Data non valida",
                tecniciNomi,
                tipoGiornataNome,
                naveNome,
                luogoNome,
                clienteNome,
                ore,
                data: rapportino.data instanceof Timestamp ? rapportino.data.toDate() : null,
                tecnicoIds,
                naveId: rapportino.naveId,
                clienteId: clienteId,
                tipoGiornataId: rapportino.tipoGiornataId,
                luogoId: rapportino.luogoId,
            };
        });
    }, [rapportini, tipiGiornata, tecnici, navi, clienti, luoghi]);

    const filteredRapportini = useMemo(() => {
        return flatRapportini.filter(r => {
           if (filters.dataDa && (!r.data || dayjs(r.data).isBefore(filters.dataDa, 'day'))) return false;
           if (filters.dataA && (!r.data || dayjs(r.data).isAfter(filters.dataA, 'day'))) return false;
           if (filters.tecnico && !r.tecnicoIds.includes(filters.tecnico.id)) return false;
           if (filters.nave && r.naveId !== filters.nave.id) return false;
           if (filters.cliente && r.clienteId !== filters.cliente.id) return false;
           if (filters.tipoGiornata && r.tipoGiornataId !== filters.tipoGiornata.id) return false;
           if (filters.luogo && r.luogoId !== filters.luogo.id) return false;
           return true;
       });
   }, [flatRapportini, filters]);

    const handleDeleteRequest = useCallback((id: string) => setRowToDelete(id), []);
    const handleConfirmDelete = async () => {
        if (!rowToDelete) return;
        try {
            await deleteDoc(doc(db, 'rapportini', rowToDelete));
            setSnackbar({ open: true, message: 'Rapportino eliminato!', severity: 'success' });
        } catch (error) {
            console.error("Errore eliminazione", error);
            setSnackbar({ open: true, message: "Errore durante l'eliminazione.", severity: 'error' });
        }
        setRowToDelete(null);
    };
    const handleRowClick = (params: GridRowParams) => {
        if (params.field === 'actions') {
            return;
        }
        navigate(`/rapportino/edit/${params.id}`);
    };
    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);
    const handlePrint = (id: string) => window.open(`/rapportini/stampa/${id}`, '_blank');
    const handleFilterChange = useCallback(<K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);
    const resetFilters = useCallback(() => setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null }), []);

    const columns: GridColDef<FlatRapportino>[] = useMemo(() => [
        { field: 'dataFormatted', headerName: 'Data', width: 110, sortable: true },
        { 
            field: 'tecniciNomi', 
            headerName: 'Tecnici', 
            flex: 1.5, 
            renderCell: params => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {Array.isArray(params.value) && params.value.map((nome: string, index: number) => <Chip key={index} label={nome} size="small" variant="outlined" />)}
                </Box>
            ) 
        },
        { field: 'tipoGiornataNome', headerName: 'Tipo Giornata', flex: 1 },
        { field: 'naveNome', headerName: 'Nave', flex: 1 },
        { field: 'luogoNome', headerName: 'Luogo', flex: 1 },
        { field: 'clienteNome', headerName: 'Cliente', flex: 1 },
        { field: 'ore', headerName: 'Tot. Ore', width: 100, align: 'right', headerAlign: 'right' },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 100,
            getActions: ({ id }) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={(e) => { e.stopPropagation(); handleEdit(id as string);}} />,
                <GridActionsCellItem icon={<PrintIcon />} label="Stampa" onClick={(e) => { e.stopPropagation(); handlePrint(id as string);}} />,
                <GridActionsCellItem icon={<DeleteIcon color="error" />} label="Elimina" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(id as string);}} />,
            ],
        },
    ], [handleEdit, handlePrint, handleDeleteRequest]);
    
    const renderContent = () => {
        if (anagraficheLoading || rapportiniLoading) {
            return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
        }
        if (anagraficheError || rapportiniError) {
            return <Alert severity="error">{anagraficheError || rapportiniError}</Alert>;
        }
        return (
            <>
                <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Filtri Ricerca</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={tecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`.trim()} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={navi} getOptionLabel={(o) => o.nome} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={luoghi} getOptionLabel={(o) => o.nome} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={clienti} getOptionLabel={(o) => o.nome} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={tipiGiornata} getOptionLabel={(o) => o.nome} value={filters.tipoGiornata} onChange={(_, v) => handleFilterChange('tipoGiornata', v)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera</Button></Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <DataGrid
                        rows={filteredRapportini}
                        columns={columns}
                        loading={anagraficheLoading || rapportiniLoading}
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                        slots={{ toolbar: GridToolbar }}
                        slotProps={{ toolbar: { showQuickFilter: true } }}
                        initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'dataFormatted', sort: 'desc' }] } }}
                        pageSizeOptions={[10, 25, 50, 100]}
                        density="compact"
                        onRowClick={handleRowClick}
                        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }} 
                    />
                </Paper>
            </>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ height: 'calc(100vh - 120px)', width: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 }, gap: 2 }}>
                {renderContent()}
                <ConfirmationDialog open={!!rowToDelete} onClose={() => setRowToDelete(null)} onConfirm={handleConfirmDelete} title="Conferma Eliminazione" description={"Sei sicuro di voler eliminare il rapportino selezionato? L'azione è irreversibile."} />
                {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
            </Box>
        </LocalizationProvider>
    );
};

export default RicercaAvanzata;
