
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { Paper, Typography, Button, CircularProgress, Box, Grid, TextField, Autocomplete, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DataGrid, GridToolbar, GridColDef } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Tecnico, Cliente, Nave, Luogo } from '@/models/definitions';
import { useNavigate } from 'react-router-dom';

dayjs.locale('it');

// --- INTERFACCE ---
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

// --- COMPONENTE DIALOGO DI VISUALIZZAZIONE ---
const ViewInfoRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <Grid
        sx={{ mb: 2 }}
        size={{
            xs: 12,
            sm: 6
        }}>
        <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
        <Typography variant="body1">{value || '--'}</Typography>
    </Grid>
);

const RapportinoViewDialog = ({ open, onClose, rapportinoId }: { open: boolean, onClose: () => void, rapportinoId: string | null }) => {
    const [rapportino, setRapportino] = useState<any>(null);
    const [loading, setLoading] = useState(false);

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
                    const tecnicoSnap = data.tecnicoScriventeId ? await getDoc(doc(db, 'tecnici', data.tecnicoScriventeId)) : null;
                    const naveSnap = data.naveId ? await getDoc(doc(db, 'navi', data.naveId)) : null;
                    const clienteSnap = data.clienteId ? await getDoc(doc(db, 'clienti', data.clienteId)) : null;

                    setRapportino({
                        id: rapportinoSnap.id,
                        ...data,
                        tecnicoNome: tecnicoSnap?.exists() ? `${tecnicoSnap.data().cognome} ${tecnicoSnap.data().nome}` : 'N/D',
                        naveNome: naveSnap?.exists() ? naveSnap.data().nome : 'N/D',
                        clienteNome: clienteSnap?.exists() ? clienteSnap.data().nome : 'N/D',
                    });
                }
            } catch (error) {
                console.error("Errore nel caricare i dettagli del rapportino", error);
            }
            setLoading(false);
        };

        fetchFullRapportino();
    }, [open, rapportinoId]);
    
    const formatTimestamp = (ts: any) => ts?.toDate ? dayjs(ts.toDate()).format('HH:mm') : 'N/D';

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Dettaglio Rapportino</DialogTitle>
            <DialogContent dividers>
                {loading && <CircularProgress />}
                {!loading && rapportino && (
                    <Grid container spacing={2}>
                        <ViewInfoRow label="Data" value={rapportino.data?.toDate ? dayjs(rapportino.data.toDate()).format('DD/MM/YYYY') : 'N/D'} />
                        <ViewInfoRow label="Nave" value={rapportino.naveNome} />
                        <ViewInfoRow label="Tecnico" value={rapportino.tecnicoNome} />
                        <ViewInfoRow label="Cliente" value={rapportino.clienteNome} />
                        <ViewInfoRow label="Orario" value={`Dalle ${formatTimestamp(rapportino.oraInizio)} alle ${formatTimestamp(rapportino.oraFine)}`} />
                        <ViewInfoRow label="Ore Lavorate" value={rapportino.oreLavorate ? `${rapportino.oreLavorate}h` : 'N/D'} />
                        <Grid size={12}>
                            <Typography variant="caption" color="text.secondary" component="div">Descrizione Lavori Svolti</Typography>
                            <Paper variant="outlined" sx={{ p: 2, mt: 0.5, whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto'}}>
                                {rapportino.descrizione || 'Nessuna descrizione fornita.'}
                            </Paper>
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

  const [filters, setFilters] = useState<FilterState>({ 
    dataDa: null, dataA: null, tecnico: null, nave: null, luogo: null, cliente: null 
  });

  const [options, setOptions] = useState<FilterOptions>({ tecnici: [], clienti: [], navi: [], luoghi: [] });

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRapportinoId, setSelectedRapportinoId] = useState<string | null>(null);

  const handleOpenViewDialog = (id: string) => {
    setSelectedRapportinoId(id);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedRapportinoId(null);
  };
  
  // ** NUOVA AZIONE DI STAMPA **
  const handlePrint = (id: string) => {
      // Apre una nuova scheda del browser puntando direttamente alla pagina di stampa dedicata.
      window.open(`/rapportini/stampa/${id}`, '_blank');
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [rapportiniSnap, tecniciSnap, naviSnap, clientiSnap, luoghiSnap] = await Promise.all([
            getDocs(collection(db, 'rapportini')),
            getDocs(collection(db, 'tecnici')),
            getDocs(collection(db, 'navi')),
            getDocs(collection(db, 'clienti')),
            getDocs(collection(db, 'luoghi')),
        ]);

        const mapSnap = <T extends {id: string}>(snap: DocumentData): T[] => snap.docs.map((d: DocumentData) => ({ id: d.id, ...d.data() } as T));
        
        const allTecnici = mapSnap<Tecnico>(tecniciSnap);
        const allNavi = mapSnap<Nave>(naviSnap);
        const allClienti = mapSnap<Cliente>(clientiSnap);
        const allLuoghi = mapSnap<Luogo>(luoghiSnap);

        const sortByName = (a: { nome?: string }, b: { nome?: string }) => (a.nome || '').localeCompare(b.nome || '');
        const sortByCognomeNome = (a: Tecnico, b: Tecnico) => {
            const cognomeCompare = (a.cognome || '').localeCompare(b.cognome || '');
            if (cognomeCompare !== 0) return cognomeCompare;
            return (a.nome || '').localeCompare(b.nome || '');
        };
        setOptions({ 
            tecnici: allTecnici.sort(sortByCognomeNome), 
            clienti: allClienti.sort(sortByName), 
            navi: allNavi.sort(sortByName), 
            luoghi: allLuoghi.sort(sortByName) 
        });

        const tecniciMap = new Map(allTecnici.map(t => [t.id, t]));
        const naviMap = new Map(allNavi.map(n => [n.id, n]));
        const clientiMap = new Map(allClienti.map(c => [c.id, c]));
        const luoghiMap = new Map(allLuoghi.map(l => [l.id, l]));

        const flatRapportiniList = rapportiniSnap.docs.map(doc => {
            const data = doc.data();
            const tecnico = data.tecnicoScriventeId ? tecniciMap.get(data.tecnicoScriventeId) : null;
            const nave = data.naveId ? naviMap.get(data.naveId) : null;
            const cliente = data.clienteId ? clientiMap.get(data.clienteId) : null;
            const luogo = data.luogoId ? luoghiMap.get(data.luogoId) : null;
            
            let dataValue: Date | null = data.data?.toDate ? data.data.toDate() : null;

            let oreString = '--';
            if (data.oreLavorate != null) {
                oreString = `${data.oreLavorate}h`;
            } else if (data.oraInizio && data.oraFine) {
                try {
                    const inizio = dayjs(data.oraInizio.toDate());
                    const fine = dayjs(data.oraFine.toDate());
                    if (inizio.isValid() && fine.isValid()) {
                        oreString = `${inizio.format('HH:mm')} - ${fine.format('HH:mm')}`;
                    }
                } catch {}
            }
            
            return {
                id: doc.id,
                data: dataValue,
                dataFormatted: dataValue ? dayjs(dataValue).format('DD/MM/YYYY') : '--',
                tecnicoNome: tecnico ? `${tecnico.cognome} ${tecnico.nome}`.trim() : '--',
                naveNome: nave?.nome || '--',
                clienteNome: cliente?.nome || '--',
                luogoNome: luogo?.nome || '--',
                ore: oreString,
                tecnicoId: tecnico?.id,
                naveId: nave?.id,
                clienteId: cliente?.id,
                luogoId: luogo?.id,
            };
        });

        setRapportini(flatRapportiniList);
    } catch (error) {
        console.error("Errore critico durante il caricamento dei dati:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilterChange = <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const resetFilters = () => {
    setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, luogo: null, cliente: null });
  };

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
    { field: 'ore', headerName: 'Ore', width: 130 },
    {
        field: 'actions',
        headerName: 'Azioni',
        width: 150,
        sortable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
            <Box>
                <IconButton color="default" onClick={() => handleOpenViewDialog(params.row.id)} title="Visualizza Dettagli"><VisibilityIcon /></IconButton>
                <IconButton color="primary" onClick={() => navigate(`/rapportini/${params.row.id}`)} title="Modifica Rapportino"><EditIcon /></IconButton>
                <IconButton color="secondary" onClick={() => handlePrint(params.row.id)} title="Stampa Rapportino"><PrintIcon /></IconButton>
            </Box>
        ),
    },
  ];

  if (loading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
  }

  return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper elevation={2} sx={{ p: 2, mb: 3, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" component="h2">Filtri di Ricerca</Typography>
                </Box>
                <Grid container spacing={2} alignItems="center">
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                            md: 3
                        }}><DatePicker label="Da" value={filters.dataDa} onChange={date => handleFilterChange('dataDa', date)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                            md: 3
                        }}><DatePicker label="A" value={filters.dataA} onChange={date => handleFilterChange('dataA', date)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                            md: 3
                        }}>
                        <Autocomplete options={options.tecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={filters.tecnico} onChange={(_, val) => handleFilterChange('tecnico', val)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id} />
                    </Grid>
                     <Grid
                         size={{
                             xs: 12,
                             sm: 6,
                             md: 3
                         }}>
                        <Autocomplete options={options.navi} getOptionLabel={(o) => o.nome || ''} value={filters.nave} onChange={(_, val) => handleFilterChange('nave', val)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id} />
                    </Grid>
                     <Grid
                         size={{
                             xs: 12,
                             sm: 6,
                             md: 3
                         }}>
                        <Autocomplete options={options.luoghi} getOptionLabel={(o) => o.nome || ''} value={filters.luogo} onChange={(_, val) => handleFilterChange('luogo', val)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id} />
                    </Grid>
                     <Grid
                         size={{
                             xs: 12,
                             sm: 6,
                             md: 3
                         }}>
                        <Autocomplete options={options.clienti} getOptionLabel={(o) => o.nome || ''} value={filters.cliente} onChange={(_, val) => handleFilterChange('cliente', val)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id} />
                    </Grid>
                    <Grid container justifyContent="flex-end" size={12}>
                        <Button onClick={resetFilters} variant="outlined">Azzera Filtri</Button>
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <DataGrid
                    rows={filteredRapportini || []}
                    columns={columns}
                    getRowId={(row) => row.id}
                    localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                    slots={{ toolbar: GridToolbar }}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: {
                            sortModel: [{ field: 'dataFormatted', sort: 'desc' }],
                        },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    disableRowSelectionOnClick
                />
            </Paper>

            <RapportinoViewDialog 
                open={viewDialogOpen} 
                onClose={handleCloseViewDialog} 
                rapportinoId={selectedRapportinoId} 
            />

          </Box>
      </LocalizationProvider>
  );
};

export default RicercaAvanzata;
