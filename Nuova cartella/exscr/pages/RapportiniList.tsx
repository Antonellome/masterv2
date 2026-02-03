import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, getDoc, DocumentReference, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useNavigate } from 'react-router-dom';
import { 
    Paper, Typography, Button, CircularProgress, Box, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Grid, TextField, Autocomplete, IconButton 
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs as DayjsType } from 'dayjs';
import 'dayjs/locale/it';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { Rapportino, Tecnico, Cliente, Nave, Luogo } from '@/models/definitions';

dayjs.locale('it');

// Interfacce per una tipizzazione forte
interface RapportinoPopulated extends Omit<Rapportino, 'tecnicoScriventeId' | 'naveId' | 'clienteId' | 'luogoId' | 'data'> {
    id: string;
    data: Date;
    tecnicoScrivente: Tecnico | null;
    nave: Nave | null;
    cliente: Cliente | null;
    luogo: Luogo | null;
}

interface FilterOptions {
    tecnici: Tecnico[];
    clienti: Cliente[];
    navi: Nave[];
    luoghi: Luogo[];
}

interface FilterState {
    dataDa: DayjsType | null;
    dataA: DayjsType | null;
    tecnico: Tecnico | null;
    nave: Nave | null;
    luogo: Luogo | null;
    cliente: Cliente | null;
}

const RapportiniList = () => {
  const [rapportini, setRapportini] = useState<RapportinoPopulated[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterState>({ 
    dataDa: null, dataA: null, tecnico: null, nave: null, luogo: null, cliente: null 
  });

  const [options, setOptions] = useState<FilterOptions>({ tecnici: [], clienti: [], navi: [], luoghi: [] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const mapSnap = <T extends {id: string}>(snap: DocumentData): T[] => snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as T));

        const [tecniciSnap, clientiSnap, naviSnap, luoghiSnap] = await Promise.all([
            getDocs(collection(db, 'tecnici')),
            getDocs(collection(db, 'clienti')),
            getDocs(collection(db, 'navi')),
            getDocs(collection(db, 'luoghi')),
        ]);

        const sortByCognomeNome = (a: Tecnico, b: Tecnico) => (a.cognome || '').localeCompare(b.cognome || '') || (a.nome || '').localeCompare(b.nome || '');
        const sortByName = (a: { nome?: string }, b: { nome?: string }) => (a.nome || '').localeCompare(b.nome || '');

        setOptions({ 
            tecnici: mapSnap<Tecnico>(tecniciSnap).sort(sortByCognomeNome), 
            clienti: mapSnap<Cliente>(clientiSnap).sort(sortByName),
            navi: mapSnap<Nave>(naviSnap).sort(sortByName),
            luoghi: mapSnap<Luogo>(luoghiSnap).sort(sortByName),
        });

        const rapportiniSnapshot = await getDocs(collection(db, 'rapportini'));
        const rapportiniList = await Promise.all(rapportiniSnapshot.docs.map(async (d) => {
            const data = d.data() as Rapportino;
            
            const resolveRef = async <T,>(ref: DocumentReference | undefined): Promise<T | null> => {
                if (!ref) return null;
                const docSnap = await getDoc(ref);
                return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
            };
            
            const [tecnicoScrivente, nave, cliente, luogo] = await Promise.all([
                resolveRef<Tecnico>(data.tecnicoScriventeId as DocumentReference),
                resolveRef<Nave>(data.naveId as DocumentReference),
                resolveRef<Cliente>(data.clienteId as DocumentReference),
                resolveRef<Luogo>(data.luogoId as DocumentReference),
            ]);

            return {
                ...data,
                id: d.id,
                data: data.data.toDate(),
                tecnicoScrivente,
                nave,
                cliente,
                luogo,
            } as RapportinoPopulated;
        }));
        setRapportini(rapportiniList);
    } catch (error) {
        console.error("Errore durante il fetch dei dati:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const resetFilters = () => {
    setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, luogo: null, cliente: null });
  };

  const filteredRapportini = useMemo(() => {
    return rapportini.filter(r => {
      const rapportinoDate = dayjs(r.data);
      if (filters.dataDa && rapportinoDate.isBefore(filters.dataDa, 'day')) return false;
      if (filters.dataA && rapportinoDate.isAfter(filters.dataA, 'day')) return false;
      if (filters.tecnico && r.tecnicoScrivente?.id !== filters.tecnico.id) return false;
      if (filters.nave && r.nave?.id !== filters.nave.id) return false;
      if (filters.luogo && r.luogo?.id !== filters.luogo.id) return false;
      if (filters.cliente && r.cliente?.id !== filters.cliente.id) return false;
      return true;
    });
  }, [rapportini, filters]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
      <Box sx={{ p: { xs: 2, md: 3} }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Elenco Rapportini</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => navigate('/rapportini/nuovo')}
          >
            Crea Rapportino
          </Button>
        </Box>

        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Filtri</Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={date => handleFilterChange('dataDa', date)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={date => handleFilterChange('dataA', date)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete options={options.tecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={filters.tecnico} onChange={(_, val) => handleFilterChange('tecnico', val)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} isOptionEqualToValue={(o,v) => o.id === v.id} />
                </Grid>
                 <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete options={options.navi} getOptionLabel={(o) => o.nome || ''} value={filters.nave} onChange={(_, val) => handleFilterChange('nave', val)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} isOptionEqualToValue={(o,v) => o.id === v.id} />
                </Grid>
                 <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete options={options.luoghi} getOptionLabel={(o) => o.nome || ''} value={filters.luogo} onChange={(_, val) => handleFilterChange('luogo', val)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} isOptionEqualToValue={(o,v) => o.id === v.id} />
                </Grid>
                 <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete options={options.clienti} getOptionLabel={(o) => o.nome || ''} value={filters.cliente} onChange={(_, val) => handleFilterChange('cliente', val)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} isOptionEqualToValue={(o,v) => o.id === v.id} />
                </Grid>
                <Grid item xs={12} md={6} container justifyContent="flex-end">
                    <Button onClick={resetFilters} variant="outlined">Azzera Filtri</Button>
                </Grid>
            </Grid>
        </Paper>

        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Nave</TableCell>
                <TableCell>Tecnico</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Ore</TableCell>
                <TableCell>Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRapportini.length > 0 ? (
                filteredRapportini.map(r => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{dayjs(r.data).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{r.nave?.nome || '--'}</TableCell>
                    <TableCell>{r.tecnicoScrivente ? `${r.tecnicoScrivente.cognome} ${r.tecnicoScrivente.nome}` : '--'}</TableCell>
                    <TableCell>{r.cliente?.nome || '--'}</TableCell>
                    <TableCell>
                      {r.oreLavorate != null ? `${r.oreLavorate}h` : 
                       (r.oraInizio && r.oraFine ? `${dayjs(r.oraInizio).format('HH:mm')} - ${dayjs(r.oraFine).format('HH:mm')}` : '--')}
                    </TableCell>
                    <TableCell>
                      <IconButton color="primary" onClick={() => navigate(`/rapportini/${r.id}`)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={6} align="center">Nessun rapportino trovato</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </LocalizationProvider>
  );
};

export default RapportiniList;
