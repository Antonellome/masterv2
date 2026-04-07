
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
  Grid
} from '@mui/material';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import PlaceIcon from '@mui/icons-material/Place';
import { Checkin, Anagrafica } from '@/models/definitions';

interface CheckinVisivoProps {
  checkins: Checkin[];
  anagrafiche: Anagrafica[];
}

interface AggregatedData {
  id: string;
  nome: string;
  tipo: 'nave' | 'luogo';
  count: number;
}

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

const CheckinVisivo: React.FC<CheckinVisivoProps> = ({ checkins, anagrafiche }) => {

  const { navi, luoghi } = useMemo(() => {
    const safeCheckins = checkins || [];
    const safeAnagrafiche = anagrafiche || [];

    if (safeCheckins.length === 0 || safeAnagrafiche.length === 0) {
        return { navi: [], luoghi: [] };
    }

    const anagraficheMap = new Map(safeAnagrafiche.map(a => [a.id, a]));

    const summary = safeCheckins.reduce((acc, checkin) => {
      const locationId = checkin.anagraficaId;
      const anagrafica = anagraficheMap.get(locationId);

      if (!anagrafica) return acc;

      if (!acc[locationId]) {
        acc[locationId] = { id: anagrafica.id, nome: anagrafica.nome, tipo: anagrafica.tipo, count: 0 };
      }
      acc[locationId].count++;
      return acc;
    }, {} as { [key: string]: AggregatedData });

    const allData = Object.values(summary).sort((a, b) => b.count - a.count);
    
    return {
        navi: allData.filter(d => d.tipo === 'nave'),
        luoghi: allData.filter(d => d.tipo === 'luogo'),
    };

  }, [checkins, anagrafiche]);

  return (
    <Box>
        <Typography variant="h5" gutterBottom>Riepilogo Presenze Giornaliere</Typography>
        <Grid container spacing={4} mt={1}>
            <Grid item xs={12} md={6}>
                <RiepilogoTable title="Navi" data={navi} icon={<DirectionsBoatIcon color="primary" />} />
            </Grid>
            <Grid item xs={12} md={6}>
                <RiepilogoTable title="Luoghi" data={luoghi} icon={<PlaceIcon color="secondary" />} />
            </Grid>
        </Grid>
    </Box>
  );
};

export default CheckinVisivo;
