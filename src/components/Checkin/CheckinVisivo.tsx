
import React, { useMemo, useState, useEffect } from 'react';
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
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData';
import { Checkin } from '@/models/definitions';

// --- INTERFACCE ---
interface AggregatedData {
  id: string;
  nome: string;
  tipo: 'nave' | 'luogo';
  count: number;
}

// --- COMPONENTI INTERNI ---
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

// --- COMPONENTE PRINCIPALE ---
const CheckinVisivo: React.FC = () => {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState<boolean>(true);
  const [errorCheckins, setErrorCheckins] = useState<string | null>(null);

  const { navi, luoghi, loading: loadingAnagrafiche, error: errorAnagrafiche } = useData();

  // 1. Carica i check-in di oggi
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkinsRef = collection(db, 'checkin_giornalieri');
    const q = query(
      checkinsRef,
      where('data', '>=', Timestamp.fromDate(today)),
      where('data', '<', Timestamp.fromDate(tomorrow))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const checkinsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checkin));
        setCheckins(checkinsData);
        setLoadingCheckins(false);
    }, (error) => {
        console.error("Errore nel caricamento dei check-in:", error);
        setErrorCheckins("Errore caricamento check-in.");
        setLoadingCheckins(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Aggrega i dati per la visualizzazione
  const { naviAgg, luoghiAgg } = useMemo(() => {
    if (checkins.length === 0) {
        return { naviAgg: [], luoghiAgg: [] };
    }

    const anagrafiche = [
      ...navi.map(n => ({...n, tipo: 'nave'})),
      ...luoghi.map(l => ({...l, tipo: 'luogo'}))
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

  if (loadingAnagrafiche || loadingCheckins) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
  }
  if (errorAnagrafiche || errorCheckins) {
    return <Alert severity="error">{errorAnagrafiche || errorCheckins}</Alert>
  }

  return (
    <Box>
        <Typography variant="h5" gutterBottom>Riepilogo Visivo Presenze</Typography>
        <Grid container spacing={4} mt={1}>
            <Grid item xs={12} md={6}>
                <RiepilogoTable title="Navi" data={naviAgg} icon={<DirectionsBoatIcon color="primary" />} />
            </Grid>
            <Grid item xs={12} md={6}>
                <RiepilogoTable title="Luoghi" data={luoghiAgg} icon={<PlaceIcon color="secondary" />} />
            </Grid>
        </Grid>
    </Box>
  );
};

export default CheckinVisivo;
