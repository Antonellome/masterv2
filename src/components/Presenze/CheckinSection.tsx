
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db as firestore } from '@/firebase'; // Corrected import
import { useAuth } from '@/contexts/AuthProvider';

// --- Interfaces for Check-in data ---
interface CheckinData {
  id: string;
  tecnicoNome: string;
  anagraficaNome: string;
  timestamp: Timestamp;
}

interface Anagrafica {
  id: string;
  nome: string;
  tipo: 'nave' | 'luogo';
}

// --- Check-in Component Logic ---
const CheckinSection: React.FC = () => {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [anagrafiche, setAnagrafiche] = useState<Anagrafica[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroNave, setFiltroNave] = useState('');
  const [filtroLuogo, setFiltroLuogo] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Load anagrafiche for filters
  useEffect(() => {
    const anagraficheRef = collection(firestore, 'anagrafiche');
    const unsubscribe = onSnapshot(anagraficheRef, (snapshot) => {
      const anagraficheData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anagrafica));
      setAnagrafiche(anagraficheData);
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen for today's check-ins
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const checkinsRef = collection(firestore, 'checkins');
    const q = query(
      checkinsRef,
      where('timestamp', '>=', today),
      where('timestamp', '<', tomorrow)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const checkinsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as CheckinData));
      setCheckins(checkinsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching check-ins: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Apply filters
  const filteredCheckins = React.useMemo(() => {
      let result = checkins;
      if (filtroNome) {
        result = result.filter(c => c.tecnicoNome.toLowerCase().includes(filtroNome.toLowerCase()));
      }
      if (filtroNave) {
        result = result.filter(c => c.anagraficaNome === filtroNave);
      }
      if (filtroLuogo) {
        result = result.filter(c => c.anagraficaNome === filtroLuogo);
      }
      return result;
  }, [checkins, filtroNome, filtroNave, filtroLuogo]);

  // 4. Aggregate data for the summary table
  const aggregatedData = React.useMemo(() => {
      return filteredCheckins.reduce((acc, current) => {
        const key = current.anagraficaNome;
        if (!acc[key]) {
          acc[key] = { count: 0, tecnici: new Set() };
        }
        acc[key].count += 1;
        acc[key].tecnici.add(current.tecnicoNome);
        return acc;
      }, {} as Record<string, { count: number; tecnici: Set<string> }>);
  }, [filteredCheckins]);

  return (
      <Box>
        <Typography variant="h5" gutterBottom>
            Check-in del {today.toLocaleDateString('it-IT')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
            Visualizza i check-in giornalieri dei tecnici e filtra per nome, nave o luogo.
        </Typography>

        {/* Filter Section */}
        <Paper sx={{ p: 2, mb: 3}} variant="outlined">
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Filtra per nome tecnico" variant="outlined" value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Nave</InputLabel>
                        <Select value={filtroNave} label="Nave" onChange={(e) => { setFiltroNave(e.target.value as string); setFiltroLuogo(''); }}>
                            <MenuItem value=""><em>Tutte</em></MenuItem>
                            {anagrafiche.filter(a => a.tipo === 'nave').map(nave => (<MenuItem key={nave.id} value={nave.nome}>{nave.nome}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Luogo</InputLabel>
                        <Select value={filtroLuogo} label="Luogo" onChange={(e) => { setFiltroLuogo(e.target.value as string); setFiltroNave(''); }}>
                            <MenuItem value=""><em>Tutti</em></MenuItem>
                            {anagrafiche.filter(a => a.tipo === 'luogo').map(luogo => (<MenuItem key={luogo.id} value={luogo.nome}>{luogo.nome}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Paper>

        {/* Summary Section */}
        {loading ? (
             <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : Object.keys(aggregatedData).length > 0 ? (
            <Box>
            {Object.entries(aggregatedData).map(([anagrafica, data]) => (
                <Paper key={anagrafica} sx={{ p: 2, mb: 2 }} variant="outlined">
                    <Typography variant="h6">{anagrafica} - {data.count} {data.count > 1 ? 'tecnici' : 'tecnico'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {Array.from(data.tecnici).join(', ')}
                    </Typography>
                </Paper>
            ))}
            </Box>
        ) : (
            <Typography>Nessun check-in trovato per la data o i filtri selezionati.</Typography>
        )}
      </Box>
  );
}

export default CheckinSection;
