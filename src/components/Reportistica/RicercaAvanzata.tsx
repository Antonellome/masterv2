
import React, { useState, useMemo, useCallback } from 'react';
import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Paper, Typography, Button, Box, TextField, Autocomplete, Grid,
    Snackbar, Alert, Chip
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
import { Tecnico, Nave, Cliente, Luogo, TipoGiornata } from '@/models/definitions';
import { useCollectionData } from '@/hooks/useCollectionData';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { db as firestoreDb } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

dayjs.locale('it');

// --- INTERFACCE & HELPERS ---
interface FlatRapportino {
    id: string;
    dataFormatted: string;
    tecniciNomi: string[];
    tipoGiornataNome: string;
    naveNome: string;
    luogoNome: string;
    clienteNome: string;
    ordineLavoro?: string;
    oreResponsabile: string;
    oreTotali: string;
    data: Date;
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
    ordineLavoro: string;
}

const dateSortComparator: GridSortComparator<Date> = (v1, v2) => v1.getTime() - v2.getTime();

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

const RicercaAvanzata: React.FC = () => {
    const navigate = useNavigate();
    
    const rapportini = useLiveQuery(() => db.rapportini.toArray(), []);
    const { data: anagraficaTecnici, loading: lTecn } = useCollectionData<Tecnico>('tecnici');
    const { data: anagraficaNavi, loading: lNav } = useCollectionData<Nave>('navi');
    const { data: anagraficaClienti, loading: lCli } = useCollectionData<Cliente>('clienti');
    const { data: anagraficaLuoghi, loading: lLuo } = useCollectionData<Luogo>('luoghi');
    const { data: anagraficaTipiGiornata, loading: lTip } = useCollectionData<TipoGiornata>('tipiGiornata');
    
    const anagraficheLoading = lTecn || lNav || lCli || lLuo || lTip;
    const rapportiniLoading = rapportini === undefined;

    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' });
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);
    const handlePrintOrShare = useCallback((id: string) => { /* Logica Stampa */ }, []);

    const flatRapportini = useMemo((): FlatRapportino[] => {
        if (!rapportini || anagraficheLoading) return [];

        const tecniciMap = new Map(anagraficaTecnici.map((t) => [t.id, t]));
        const naviMap = new Map(anagraficaNavi.map((n) => [n.id, n]));
        const clientiMap = new Map(anagraficaClienti.map((c) => [c.id, c]));
        const tipiGiornataMap = new Map(anagraficaTipiGiornata.map((tg) => [tg.id, tg]));
        const luoghiMap = new Map(anagraficaLuoghi.map((l) => [l.id, l]));

        return rapportini.map((rapportino) => {
            const dataNormalizzata = normalizeDate(rapportino.data);
            
            // --- LOGICA CLIENTE - BRUTALE E DEFINITIVA ---
            let clienteNome = "N/D";
            let finalClienteId: string | undefined = undefined;

            // 1. TENTO CON LA NAVE
            const naveId = getCleanId(rapportino.naveId);
            if (naveId) {
                const nave = naviMap.get(naveId);
                if (nave) {
                    const clienteId = getCleanId(nave.clienteId);
                    if (clienteId) {
                        const cliente = clientiMap.get(clienteId);
                        if (cliente) {
                            clienteNome = cliente.nome;
                            finalClienteId = cliente.id;
                        }
                    }
                }
            }

            // 2. SE NON HO TROVATO NULLA, TENTO CON IL LUOGO (STESSA IDENTICA LOGICA)
            if (clienteNome === "N/D") {
                const luogoId = getCleanId(rapportino.luogoId);
                if (luogoId) {
                    const luogo = luoghiMap.get(luogoId);
                    if (luogo) {
                        const clienteId = getCleanId(luogo.clienteId);
                        if (clienteId) {
                            const cliente = clientiMap.get(clienteId);
                            if (cliente) {
                                clienteNome = cliente.nome;
                                finalClienteId = cliente.id;
                            }
                        }
                    }
                }
            }
            // --- FINE LOGICA CLIENTE ---

            const tecnicoIds = (Array.isArray(rapportino.presenze) ? rapportino.presenze.map(getCleanId) : []).filter(Boolean) as string[];
            const tecniciNomi = tecnicoIds.map(id => {
                const t = tecniciMap.get(id);
                return t ? `${t.cognome} ${t.nome}`.trim() : `ID: ${id}`;
            });
            
            const tipoGiornataId = getCleanId(rapportino.tipoGiornataId);
            const tipoGiornataObj = tipoGiornataId ? tipiGiornataMap.get(tipoGiornataId) : undefined;
            const naveObj = naveId ? naviMap.get(naveId) : undefined;
            const luogoId = getCleanId(rapportino.luogoId);
            const luogoObj = luogoId ? luoghiMap.get(luogoId) : undefined;

            let oreTotaliRapporto = rapportino.dettaglioOreTecnici?.reduce((sum, d) => sum + (d.ore || 0), 0) ?? Number(rapportino.oreLavoro) ?? 0;
            const dettaglioResponsabile = rapportino.dettaglioOreTecnici?.find(d => getCleanId(d.tecnicoId) === getCleanId(rapportino.tecnicoId));
            let oreResponsabile = dettaglioResponsabile?.ore ?? (rapportino.dettaglioOreTecnici ? 0 : oreTotaliRapporto);

            return {
                id: rapportino.id,
                data: dataNormalizzata,
                dataFormatted: dayjs(dataNormalizzata).isValid() ? dayjs(dataNormalizzata).format("DD/MM/YYYY") : "Data Invalida",
                tecniciNomi,
                tipoGiornataNome: tipoGiornataObj?.nome || "N/D",
                naveNome: naveObj?.nome || "N/D",
                luogoNome: luogoObj?.nome || "N/D",
                clienteNome,
                ordineLavoro: rapportino.ordineLavoro,
                oreResponsabile: formatOreLavoro(oreResponsabile),
                oreTotali: formatOreLavoro(oreTotaliRapporto),
                tecnicoIds, 
                naveId: naveId,
                clienteId: finalClienteId, 
                tipoGiornataId: tipoGiornataId,
                luogoId: luogoId,
            };
        });
    }, [rapportini, anagraficaTecnici, anagraficaNavi, anagraficaClienti, anagraficaLuoghi, anagraficaTipiGiornata, anagraficheLoading]);
    
    const filteredRapportini = useMemo(() => {
        return flatRapportini.filter(r => {
           const r_data = dayjs(r.data);
           if (filters.dataDa && r_data.isBefore(filters.dataDa, 'day')) return false;
           if (filters.dataA && r_data.isAfter(filters.dataA, 'day')) return false;
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
        try {
            await deleteDoc(doc(firestoreDb, 'rapportini', rowToDelete));
            await db.rapportini.delete(rowToDelete);
            setSnackbar({ open: true, message: 'Rapportino eliminato con successo.', severity: 'success' });
        } catch (error) {
            console.error("Errore eliminazione:", error);
            setSnackbar({ open: true, message: "Errore durante l'eliminazione del rapportino.", severity: 'error' });
        }
        setRowToDelete(null);
    };
    
    const handleRowClick = (params: GridRowParams) => {
        if (params.field !== 'actions') {
            navigate(`/rapportino/edit/${params.id}`);
        }
    };

    const handleFilterChange = useCallback(<K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const resetFilters = useCallback(() => setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' }), []);

    const columns: GridColDef<FlatRapportino>[] = useMemo(() => [
        { field: 'data', headerName: 'Data', width: 110, renderCell: (params) => params.row.dataFormatted, sortComparator: dateSortComparator, type: 'date' },
        { field: 'tecniciNomi', headerName: 'Tecnici', flex: 1.5, minWidth: 150, renderCell: params => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 1, my: 1, alignItems: 'center' }} >
                {Array.isArray(params.value) && params.value.map((nome, index) => <Chip key={index} label={nome} size="small" variant='outlined' />)}
            </Box>
        )},
        { field: 'tipoGiornataNome', headerName: 'Tipo Giornata', flex: 1 },
        { field: 'ordineLavoro', headerName: 'Ordine Lavoro', flex: 1 },
        { field: 'naveNome', headerName: 'Nave', flex: 1 },
        { field: 'luogoNome', headerName: 'Luogo', flex: 1 },
        { field: 'clienteNome', headerName: 'Cliente', flex: 1 },
        { field: 'oreResponsabile', headerName: 'Ore Resp.', width: 100, align: 'right', headerAlign: 'right' },
        { field: 'oreTotali', headerName: 'Ore Totali', width: 100, align: 'right', headerAlign: 'right' },
        {
            field: 'actions', type: 'actions', headerName: 'Azioni', width: 100,
            getActions: ({ id }) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={(e) => { e.stopPropagation(); handleEdit(id as string);}} />,
                <GridActionsCellItem icon={<PrintIcon />} label="Stampa" onClick={(e) => { e.stopPropagation(); handlePrintOrShare(id as string);}} />,
                <GridActionsCellItem icon={<DeleteIcon color="error" />} label="Elimina" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(id as string);}} />,
            ],
        },
    ], [handleEdit, handlePrintOrShare, handleDeleteRequest]);
    
    const loading = anagraficheLoading || rapportiniLoading;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ height: 'calc(100vh - 120px)', width: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 }, gap: 2 }}>
                <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Filtri Ricerca</Typography>
                     <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`.trim()} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaNavi} getOptionLabel={(o) => o.nome} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaLuoghi} getOptionLabel={(o) => o.nome} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaClienti} getOptionLabel={(o) => o.nome} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaTipiGiornata} getOptionLabel={(o) => o.nome} value={filters.tipoGiornata} onChange={(_, v) => handleFilterChange('tipoGiornata', v)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><TextField label="Ordine di Lavoro" value={filters.ordineLavoro} onChange={e => handleFilterChange('ordineLavoro', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera</Button></Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <DataGrid 
                        getRowHeight={() => 'auto'} 
                        rows={filteredRapportini} 
                        columns={columns} 
                        loading={loading} 
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
                        slots={{ toolbar: GridToolbar }} 
                        slotProps={{ toolbar: { showQuickFilter: true } }} 
                        initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'data', sort: 'desc' }] } }} 
                        pageSizeOptions={[10, 25, 50, 100]} 
                        density="compact" 
                        onRowClick={handleRowClick}
                        sx={{
                            '& .MuiDataGrid-cell': {
                                py: 1, 
                            },
                            '& .MuiDataGrid-row': { 
                                cursor: 'pointer' 
                            },
                        }}
                    />
                </Paper>
                
                <ConfirmationDialog open={!!rowToDelete} onClose={() => setRowToDelete(null)} onConfirm={handleConfirmDelete} title="Conferma Eliminazione" description={"Sei sicuro di voler eliminare questo rapportino? L'azione è irreversibile."} />
                {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
            </Box>
        </LocalizationProvider>
    );
};

export default RicercaAvanzata;
