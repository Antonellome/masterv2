import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Paper, Typography, Button, CircularProgress, Box, TextField, Autocomplete, Grid,
    Toolbar, IconButton, Tooltip, Snackbar, Alert
} from '@mui/material';
import { DataGrid, GridToolbar, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { RapportinoSchema } from '@/models/rapportino.schema';
import { formatOreLavoro } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmationDialog from '@/components/ConfirmationDialog';

// Definizioni di tipo locali per evitare errori di importazione
interface Tecnico { id: string; nome?: string; cognome?: string; }
interface Cliente { id: string; nome?: string; }
interface Nave { id: string; nome?: string; clienteId?: string; }
interface Luogo { id: string; nome?: string; }

dayjs.locale('it');

// TIPO DATI PIATTO (da Blueprint)
interface FlatRapportino {
    id: string;
    dataFormatted: string;
    tecnicoNome: string;
    naveNome: string;
    clienteNome: string;
    ore: string;
    data: Date | null;
    tecnicoId?: string;
    naveId?: string;
    clienteId?: string;
}

// ... (interfacce FilterOptions e FilterState rimangono invariate) ...
interface FilterOptions {
    tecnici: Tecnico[];
    clienti: Cliente[];
    navi: Nave[];
    luoghi: Luogo[];
}

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnico: Tecnico | null;
    nave: Nave | null;
    cliente: Cliente | null;
}

// --- COMPONENTE BARRA AZIONI (Logica esterna alla griglia, da Blueprint) ---
interface ActionsToolbarProps {
    selectedId: string | null;
    onEdit: () => void;
    onPrint: () => void;
    onDelete: () => void;
}

const ActionsToolbar: React.FC<ActionsToolbarProps> = ({ selectedId, onEdit, onPrint, onDelete }) => {
    const hasSelection = !!selectedId;

    return (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 1, bgcolor: 'background.paper' }}>
            <Toolbar variant="dense">
                 <Typography sx={{ flex: '1 1 100%' }} variant="h6" component="div">
                    Rapportini
                </Typography>
                <Tooltip title="Modifica Rapportino">
                    <span>
                        <IconButton onClick={onEdit} disabled={!hasSelection}>
                            <EditIcon />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Stampa Rapportino">
                     <span>
                        <IconButton onClick={onPrint} disabled={!hasSelection}>
                            <PrintIcon />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Elimina Rapportino">
                     <span>
                        <IconButton onClick={onDelete} disabled={!hasSelection} color="error">
                            <DeleteIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Toolbar>
        </Box>
    );
};


const RicercaAvanzata: React.FC = () => {
    const [rapportini, setRapportini] = useState<FlatRapportino[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    // --- STATI ---
    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null });
    const [options, setOptions] = useState<FilterOptions>({ tecnici: [], clienti: [], navi: [], luoghi: [] });
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
    
    // Stati per la logica di eliminazione
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const forceRefresh = () => setRefreshTrigger(t => t + 1);

    // --- CARICAMENTO E PRE-ELABORAZIONE DATI (da Blueprint) ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            // ... (stessa logica di fetch e creazione mappe) ...
            const [rapportiniSnap, tecniciSnap, naviSnap, clientiSnap] = await Promise.all([
                getDocs(collection(db, "rapportini")),
                getDocs(collection(db, "tecnici")),
                getDocs(collection(db, "navi")),
                getDocs(collection(db, "clienti")),
            ]);

            const allTecnici = tecniciSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tecnico));
            const allNavi = naviSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Nave));
            const allClienti = clientiSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Cliente));
            
            setOptions({
                 tecnici: [...allTecnici].sort((a, b) => (a.cognome || "").localeCompare(b.cognome || "")),
                 clienti: [...allClienti].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
                 navi: [...allNavi].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
                 luoghi: []
            });

            const tecniciMap = new Map(allTecnici.map((t) => [t.id, t]));
            const naviMap = new Map(allNavi.map((n) => [n.id, n]));
            const clientiMap = new Map(allClienti.map((c) => [c.id, c]));

            const flatRapportiniList: FlatRapportino[] = rapportiniSnap.docs.map((doc) => {
                 const data = doc.data() as RapportinoSchema;
                    
                const tecnico = data.tecnicoId ? tecniciMap.get(data.tecnicoId) : null;
                const nave = data.naveId ? naviMap.get(data.naveId) : null;
                const cliente = (nave?.clienteId ? clientiMap.get(nave.clienteId) : null) || (data.clienteId ? clientiMap.get(data.clienteId) : null);

                const nomeTecnico = tecnico ? `${tecnico.cognome} ${tecnico.nome}`.trim() : (data.tecnicoId ? "Tecnico Cancellato" : "--");
                const totalOre = data.oreLavorate || 0;

                return {
                    id: doc.id,
                    dataFormatted: data.data instanceof Timestamp ? dayjs(data.data.toDate()).format("DD/MM/YYYY") : "--",
                    tecnicoNome: nomeTecnico,
                    naveNome: nave?.nome || "--",
                    clienteNome: cliente?.nome || "--",
                    ore: formatOreLavoro(totalOre),
                    data: data.data instanceof Timestamp ? data.data.toDate() : null,
                    tecnicoId: tecnico?.id,
                    naveId: nave?.id,
                    clienteId: cliente?.id,
                };
            });
            setRapportini(flatRapportiniList);
            setLoading(false);
        };
        fetchData().catch(console.error);
    }, [refreshTrigger]);

    // --- GESTIONE AZIONI --- 
    const selectedId = selectionModel.length > 0 ? (selectionModel[0] as string) : null;

    const handleEdit = () => {
        if (selectedId) navigate(`/rapportini/${selectedId}`);
    };
    const handlePrint = () => {
        if (selectedId) window.open(`/rapportini/stampa/${selectedId}`, '_blank');
    };
    const handleDeleteRequest = () => {
        if (selectedId) setConfirmOpen(true);
    };
    const handleConfirmDelete = async () => {
        if (!selectedId) return;
        try {
            await deleteDoc(doc(db, 'rapportini', selectedId));
            setSnackbar({ open: true, message: 'Rapportino eliminato con successo!', severity: 'success' });
            forceRefresh(); // Ricarica i dati
        } catch (error) {
            console.error("Errore eliminazione", error);
            setSnackbar({ open: true, message: 'Errore durante l\'eliminazione.', severity: 'error' });
        }
        setConfirmOpen(false);
    };

    // --- GESTIONE FILTRI E DATI FILTRATI ---
    const handleFilterChange = useCallback(<K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);
    const resetFilters = useCallback(() => {
        setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null });
    }, []);

    const filteredRapportini = useMemo(() => {
         return rapportini.filter(r => {
            if (filters.dataDa && (!r.data || dayjs(r.data).isBefore(filters.dataDa, 'day'))) return false;
            if (filters.dataA && (!r.data || dayjs(r.data).isAfter(filters.dataA, 'day'))) return false;
            if (filters.tecnico && r.tecnicoId !== filters.tecnico.id) return false;
            if (filters.nave && r.naveId !== filters.nave.id) return false;
            if (filters.cliente && r.clienteId !== filters.cliente.id) return false;
            return true;
        });
    }, [rapportini, filters]);

    // --- COLONNE STUPIDE (da Blueprint) ---
    const columns: GridColDef<FlatRapportino>[] = [
        { field: 'dataFormatted', headerName: 'Data', width: 110 },
        { field: 'tecnicoNome', headerName: 'Tecnico', flex: 1.5 },
        { field: 'naveNome', headerName: 'Nave', flex: 1 },
        { field: 'clienteNome', headerName: 'Cliente', flex: 1 },
        { field: 'ore', headerName: 'Ore Totali', width: 120, align: 'right', headerAlign: 'right' },
    ];
  
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    // --- RENDER ---
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 }, gap: 2 }}>
                <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                    <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Filtri di Ricerca</Typography>
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
                            }}><Autocomplete options={options.tecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={options.navi} getOptionLabel={(o) => o.nome || ''} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={options.clienti} getOptionLabel={(o) => o.nome || ''} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} /></Grid>
                        <Grid
                            sx={{ display: 'flex', alignItems: 'center' }}
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera Filtri</Button></Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                     <ActionsToolbar 
                        selectedId={selectedId}
                        onEdit={handleEdit}
                        onPrint={handlePrint}
                        onDelete={handleDeleteRequest}
                    />
                    <DataGrid
                        rows={filteredRapportini}
                        columns={columns}
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                        slots={{ toolbar: GridToolbar }}
                        slotProps={{ toolbar: { showQuickFilter: true } }}
                        initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'dataFormatted', sort: 'desc' }] } }}
                        pageSizeOptions={[10, 25, 50, 100]}
                        rowSelectionModel={selectionModel}
                        onRowSelectionModelChange={setSelectionModel}
                        density="compact"
                    />
                </Paper>

                 <ConfirmationDialog open={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Conferma Eliminazione" description={`Sei sicuro di voler eliminare il rapportino selezionato? L'azione è irreversibile.`} />
                 {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
            </Box>
        </LocalizationProvider>
    );
};

export default RicercaAvanzata;
