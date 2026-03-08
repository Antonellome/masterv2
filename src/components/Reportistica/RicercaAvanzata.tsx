import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, deleteDoc, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Paper, Typography, Button, CircularProgress, Box, TextField, Autocomplete, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Grid, Divider
} from '@mui/material';
import { DataGrid, GridToolbar, GridColDef } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { Tecnico, Cliente, Nave, Luogo, Rapportino } from '@/models/definitions';
import { useNavigate } from 'react-router-dom';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { formatOreLavoro } from '@/utils/formatters';
import { TecnicoAggiunto } from '@/models/rapportino.schema';

dayjs.locale('it');

// --- TIPI ---
interface FlatRapportino {
    id: string;
    data: Date | null;
    dataFormatted: string;
    tecnicoNome: string;
    naveNome: string;
    clienteNome: string;
    luogoNome: string;
    ore: string;
    tecnicoId?: string;
    naveId?: string;
    clienteId?: string;
    luogoId?: string;
    oreLavorate?: number;
}

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
    luogo: Luogo | null;
    cliente: Cliente | null;
}

// --- COMPONENTI DI VISUALIZZAZIONE ---
const ViewInfoRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <Grid size={{ xs: 12, sm: 6 }} sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{textTransform: 'uppercase'}}>{label}</Typography>
        <Typography variant="body1">{value || '--'}</Typography>
    </Grid>
);

const RapportinoViewDialog = ({ open, onClose, rapportinoId }: { open: boolean, onClose: () => void, rapportinoId: string | null }) => {
    const [rapportino, setRapportino] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tecniciMap, setTecniciMap] = useState<Map<string, Tecnico>>(new Map());

    useEffect(() => {
        const fetchTecnici = async () => {
            const tecSnap = await getDocs(collection(db, 'tecnici'));
            const map = new Map(tecSnap.docs.map(d => [d.id, {id: d.id, ...d.data()} as Tecnico]));
            setTecniciMap(map);
        };
        fetchTecnici();
    }, []);

    useEffect(() => {
        if (!open || !rapportinoId) {
            setRapportino(null);
            return;
        }

        const fetchFullRapportino = async () => {
            setLoading(true);
            try {
                const rapportinoRef = doc(db, 'rapportini', rapportinoId);
                const rapportinoSnap = await getDoc(rapportinoRef);
                if (rapportinoSnap.exists()) {
                    const data = rapportinoSnap.data();
                    const naveSnap = data.naveId ? await getDoc(doc(db, 'navi', data.naveId)) : null;
                    const clienteId = data.clienteId || naveSnap?.data()?.clienteId;
                    const clienteSnap = clienteId ? await getDoc(doc(db, 'clienti', clienteId)) : null;
                    
                    setRapportino({
                        id: rapportinoSnap.id,
                        ...data,
                        tecnicoNome: tecniciMap.get(data.tecnicoScriventeId)?.nome ? `${tecniciMap.get(data.tecnicoScriventeId)?.cognome} ${tecniciMap.get(data.tecnicoScriventeId)?.nome}` : 'N/D',
                        naveNome: naveSnap?.exists() ? naveSnap.data().nome : 'N/D',
                        clienteNome: clienteSnap?.exists() ? clienteSnap.data().nome : 'N/D',
                    });
                }
            } catch (error) {
                console.error("Errore nel caricare i dettagli del rapportino", error);
            }
            setLoading(false);
        };

        if (tecniciMap.size > 0) fetchFullRapportino();

    }, [open, rapportinoId, tecniciMap]);
    
    const formatOrarioSingolo = (orario: any) => orario?.toDate ? dayjs(orario.toDate()).format('HH:mm') : typeof orario === 'string' ? orario : '--';

    const formatDettaglioOreTecnico = (tec: TecnicoAggiunto, principale: any) => {
         if (principale.inserimentoManualeOre) {
            return formatOreLavoro(tec.oreLavorate);
        } else {
            return `In: ${formatOrarioSingolo(tec.oraInizio)}, Out: ${formatOrarioSingolo(tec.oraFine)}, Pausa: ${tec.pausa || 0}m`;
        }
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Dettaglio Rapportino</DialogTitle>
            <DialogContent dividers>
                {loading && <CircularProgress />}
                {!loading && rapportino && (
                    <Grid container spacing={2}>
                        <ViewInfoRow label="Data" value={rapportino.data?.toDate ? dayjs(rapportino.data.toDate()).format('DD/MM/YYYY') : 'N/D'} />
                        <ViewInfoRow label="Nave" value={rapportino.naveNome} />
                        <ViewInfoRow label="Cliente" value={rapportino.clienteNome} />
                        <Grid size={{ xs: 12}}><Divider sx={{my:1}}>Orari Personale</Divider></Grid>
                        <ViewInfoRow label={`Tecnico Scrivente (${rapportino.tecnicoNome})`} value={rapportino.inserimentoManualeOre ? formatOreLavoro(rapportino.oreLavorate) : `Dalle ${formatOrarioSingolo(rapportino.oraInizio)} alle ${formatOrarioSingolo(rapportino.oraFine)}, Pausa: ${rapportino.pausa}m`} />
                        {rapportino.tecniciAggiunti && rapportino.tecniciAggiunti.length > 0 && (
                            <Grid size={{ xs: 12}}>
                                 <Typography variant="caption" color="text.secondary" component="div" sx={{textTransform: 'uppercase'}}>Altri Tecnici</Typography>
                                {rapportino.tecniciAggiunti.map((tec: TecnicoAggiunto) => {
                                    const tecInfo = tecniciMap.get(tec.tecnicoId);
                                    const nome = tecInfo ? `${tecInfo.cognome} ${tecInfo.nome}` : 'Tecnico non trovato';
                                    return <ViewInfoRow key={tec.tecnicoId} label={nome} value={formatDettaglioOreTecnico(tec, rapportino)} />;
                                })}
                            </Grid>
                        )}

                        <Grid size={{ xs: 12}}><Divider sx={{my:1}}>Dettagli Lavoro</Divider></Grid>
                        <Grid size={{ xs: 12}}>
                             <Typography variant="caption" color="text.secondary" component="div">Breve Descrizione</Typography>
                            <Typography variant="body1">{rapportino.breveDescrizione || '--'}</Typography>
                        </Grid>
                         <Grid size={{ xs: 12}}>
                             <Typography variant="caption" color="text.secondary" component="div">Lavoro Eseguito</Typography>
                             <Paper variant="outlined" sx={{ p: 1, mt: 0.5, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto'}}>{rapportino.lavoroEseguito || 'Nessuno'}</Paper>
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Chiudi</Button>
            </DialogActions>
        </Dialog>
    );
};


// --- COMPONENTE PRINCIPALE ---
const RicercaAvanzata: React.FC = () => {
  const [rapportini, setRapportini] = useState<FlatRapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, luogo: null, cliente: null });
  const [options, setOptions] = useState<FilterOptions>({ tecnici: [], clienti: [], navi: [], luoghi: [] });

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRapportinoId, setSelectedRapportinoId] = useState<string | null>(null);

  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const forceRefresh = () => setRefreshTrigger(t => t + 1);

  const handleOpenViewDialog = (id: string) => { setSelectedRapportinoId(id); setViewDialogOpen(true); };
  const handleCloseViewDialog = () => { setViewDialogOpen(false); setSelectedRapportinoId(null); };
  const handlePrint = (id: string) => window.open(`/rapportini/stampa/${id}`, '_blank');
  const handleDeleteRequest = (id: string) => { setItemToDelete(id); setConfirmOpen(true); };
  const handleConfirmDelete = async () => {
      if (itemToDelete) {
          try {
              await deleteDoc(doc(db, 'rapportini', itemToDelete));
              setSnackbar({ open: true, message: 'Rapportino eliminato!', severity: 'success' });
              forceRefresh();
          } catch (error) { console.error(error); setSnackbar({ open: true, message: "Errore durante l'eliminazione.", severity: 'error' }); }
      }
      setConfirmOpen(false);
      setItemToDelete(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rapportiniSnap, tecniciSnap, naviSnap, clientiSnap, luoghiSnap] = await Promise.all([
          getDocs(collection(db, "rapportini")),
          getDocs(collection(db, "tecnici")),
          getDocs(collection(db, "navi")),
          getDocs(collection(db, "clienti")),
          getDocs(collection(db, "luoghi")),
        ]);

        const allTecnici = tecniciSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tecnico)).sort((a, b) => (a.cognome || "").localeCompare(b.cognome || ""));
        const allNavi = naviSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Nave)).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        const allClienti = clientiSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Cliente)).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        const allLuoghi = luoghiSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Luogo)).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        
        setOptions({ tecnici: allTecnici, clienti: allClienti, navi: allNavi, luoghi: allLuoghi });

        const tecniciMap = new Map(allTecnici.map((t) => [t.id, t]));
        const naviMap = new Map(allNavi.map((n) => [n.id, n]));
        const clientiMap = new Map(allClienti.map((c) => [c.id, c]));
        const luoghiMap = new Map(allLuoghi.map((l) => [l.id, l]));

        const flatRapportiniList: FlatRapportino[] = rapportiniSnap.docs.map((doc) => {
          const data = doc.data() as Rapportino;
          const tecnico = data.tecnicoScriventeId ? tecniciMap.get(data.tecnicoScriventeId) : null;
          const nave = data.naveId ? naviMap.get(data.naveId) : null;
          const clienteId = data.clienteId || nave?.clienteId;
          const cliente = clienteId ? clientiMap.get(clienteId) : null;
          const luogo = data.luogoId ? luoghiMap.get(data.luogoId) : null;

          let totalOre = data.oreLavorate || 0;
          if (data.tecniciAggiunti) {
            totalOre += data.tecniciAggiunti.reduce((acc, tec) => acc + (tec.oreLavorate || 0), 0);
          }

          return {
            id: doc.id,
            data: data.data instanceof Timestamp ? data.data.toDate() : null,
            dataFormatted: data.data instanceof Timestamp ? dayjs(data.data.toDate()).format("DD/MM/YYYY") : "--",
            tecnicoNome: tecnico ? `${tecnico.cognome} ${tecnico.nome}`.trim() : "--",
            naveNome: nave?.nome || "--",
            clienteNome: cliente?.nome || "--",
            luogoNome: luogo?.nome || "--",
            ore: formatOreLavoro(totalOre),
            oreLavorate: totalOre,
            tecnicoId: tecnico?.id,
            naveId: nave?.id,
            clienteId: cliente?.id,
            luogoId: luogo?.id,
          };
        });
        setRapportini(flatRapportiniList);
      } catch (error) {
        console.error("Errore critico durante il caricamento:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);

  const handleFilterChange = useCallback(<K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, luogo: null, cliente: null });
  }, []);

  const filteredRapportini = useMemo(() => {
    return rapportini.filter(r => {
      if (filters.dataDa && (!r.data || dayjs(r.data).isBefore(filters.dataDa, 'day'))) return false;
      if (filters.dataA && (!r.data || dayjs(r.data).isAfter(filters.dataA, 'day'))) return false;
      if (filters.tecnico && r.tecnicoId !== filters.tecnico.id) return false;
      if (filters.nave && r.naveId !== filters.nave.id) return false;
      if (filters.luogo && r.luogoId !== filters.luogo.id) return false;
      if (filters.cliente && r.clienteId !== filters.cliente.id) return false;
      return true;
    });
  }, [rapportini, filters]);

  const columns: GridColDef<FlatRapportino>[] = [
    { field: 'dataFormatted', headerName: 'Data', width: 120 },
    { field: 'naveNome', headerName: 'Nave', flex: 1 },
    { field: 'tecnicoNome', headerName: 'Tecnico', flex: 1 },
    { field: 'clienteNome', headerName: 'Cliente', flex: 1 },
    { field: 'ore', headerName: 'Ore Totali', width: 130, description: 'Ore totali comprensive di tutti i tecnici' },
    {
        field: 'actions',
        headerName: 'Azioni',
        width: 150,
        sortable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
            <Box>
                <IconButton onClick={() => handleOpenViewDialog(params.row.id)}><VisibilityIcon /></IconButton>
                <IconButton onClick={() => navigate(`/rapportini/${params.row.id}`)}><EditIcon /></IconButton>
                <IconButton onClick={() => handlePrint(params.row.id)}><PrintIcon /></IconButton>
                <IconButton onClick={() => handleDeleteRequest(params.row.id)}><DeleteIcon /></IconButton>
            </Box>
        ),
    },
  ];
  
  const handleCloseSnackbar = () => setSnackbar(null);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p:5 }}><CircularProgress /></Box>;

  return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
          <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2, gap: 2 }}>
            <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                <Typography variant="h6" component="h2" sx={{mb:2}}>Filtri di Ricerca</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 3}}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3}}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3}}><Autocomplete options={options.tecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} /></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3}}><Autocomplete options={options.navi} getOptionLabel={(o) => o.nome || ''} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} /></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3}}><Autocomplete options={options.luoghi} getOptionLabel={(o) => o.nome || ''} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} /></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3}}><Autocomplete options={options.clienti} getOptionLabel={(o) => o.nome || ''} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} /></Grid>
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}><Button onClick={resetFilters} variant="outlined">Azzera Filtri</Button></Grid>
                </Grid>
            </Paper>

            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <DataGrid
                    rows={filteredRapportini}
                    columns={columns}
                    localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{ toolbar: { showQuickFilter: true } }}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'dataFormatted', sort: 'desc' }] } }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    disableRowSelectionOnClick
                />
            </Paper>

            <RapportinoViewDialog open={viewDialogOpen} onClose={handleCloseViewDialog} rapportinoId={selectedRapportinoId} />
            <ConfirmationDialog open={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Conferma Eliminazione" message="Sei sicuro di voler eliminare questo rapportino?" />
            {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}><Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
          </Box>
      </LocalizationProvider>
  );
};

export default RicercaAvanzata;
