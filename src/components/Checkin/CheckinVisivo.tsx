
import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import PlaceIcon from '@mui/icons-material/Place';
// Import our new central store
import { useRapportiniStore } from '@/store/useRapportiniStore';
import type { Checkin } from '@/models/definitions';

// --- INTERFACES (unchanged) ---
interface AggregatedData {
  id: string;
  nome: string;
  tipo: 'nave' | 'luogo';
  count: number;
}

// --- INTERNAL COMPONENTS (unchanged) ---
const RiepilogoTable = ({ title, data, icon }: { title: string, data: AggregatedData[], icon: React.ReactNode }) => (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
        <Box display="flex" alignItems="center" mb={2}>
            {icon}
            <Typography variant="h6" component="div" sx={{ ml: 1 }}>{title}</Typography>
        </Box>
        <TableContainer>
            <Table aria-label={`tabella riepilogo ${title}`}>
                <TableHead>
                    <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell align="center">N° Tecnici</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.length > 0 ? (
                        data.map((row) => (
                            <TableRow hover key={row.id}>
                                <TableCell component="th" scope="row">{row.nome}</TableCell>
                                <TableCell align="center">
                                    <Chip label={row.count} color="primary" sx={{fontSize: '1rem', padding: '10px 5px'}}/>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={2} align="center">
                                <Typography sx={{ p: 4, color: 'text.secondary' }}>Nessuna presenza</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);

// --- MAIN COMPONENT (Now simplified) ---
const CheckinVisivo: React.FC = () => {
  // 1. Get all data directly from the central store.
  const { navi, luoghi, checkins, loading, error } = useRapportiniStore(state => ({
    navi: state.navi,
    luoghi: state.luoghi,
    checkins: state.checkins,
    loading: state.loading,
    error: state.error,
  }));

  // 2. Memoize the aggregation logic. The core logic is the same,
  // but it now uses the pre-fetched maps for better performance.
  const { naviAgg, luoghiAgg } = useMemo(() => {
    if (!checkins || checkins.length === 0) {
        return { naviAgg: [], luoghiAgg: [] };
    }

    const anagrafiche = [
      ...navi.map(n => ({...n, tipo: 'nave' as const})),
      ...luoghi.map(l => ({...l, tipo: 'luogo' as const}))
    ];
    const anagraficheMap = new Map(anagrafiche.map(a => [a.id, a]));

    const summary = checkins.reduce((acc, checkin) => {
      const anagrafica = anagraficheMap.get(checkin.anagraficaId);
      if (!anagrafica) return acc;

      if (!acc[checkin.anagraficaId]) {
        acc[checkin.anagraficaId] = { id: anagrafica.id, nome: anagrafica.nome, tipo: anagrafica.tipo, count: 0 };
      }
      acc[checkin.anagraficaId].count++;
      return acc;
    }, {} as { [key: string]: AggregatedData });

    const allData = Object.values(summary).sort((a, b) => b.count - a.count);
    
    return {
        naviAgg: allData.filter(d => d.tipo === 'nave'),
        luoghiAgg: allData.filter(d => d.tipo === 'luogo'),
    };

  }, [checkins, navi, luoghi]);

  // 3. Render loading/error states based on the global state.
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  // 4. Render the UI (unchanged).
  return (
      <Box>
          <Typography variant="h5" gutterBottom>Riepilogo Visivo Presenze</Typography>
          <Grid container spacing={4} mt={1}>
              <Grid
                  size={{
                      xs: 12,
                      md: 6
                  }}>
                  <RiepilogoTable title="Navi" data={naviAgg} icon={<DirectionsBoatIcon color="primary" />} />
              </Grid>
              <Grid
                  size={{
                      xs: 12,
                      md: 6
                  }}>
                  <RiepilogoTable title="Luoghi" data={luoghiAgg} icon={<PlaceIcon color="secondary" />} />
              </Grid>
          </Grid>
      </Box>
  );
};

export default CheckinVisivo;
