
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, Grid, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert } from '@mui/material';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase'; 
import { useData } from '@/hooks/useData';
import { Checkin } from '@/models/definitions';

// --- Interfaces ---
interface AggregatedData {
    [key: string]: {
        count: number;
        tecnici: Set<string>;
    };
}

// --- Component Logic ---
const CheckinSection: React.FC = () => {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState<boolean>(true);
  const [errorCheckins, setErrorCheckins] = useState<string | null>(null);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroAnagrafica, setFiltroAnagrafica] = useState('');

  // Usa l'hook useData per anagrafiche, che è più efficiente
  const { navi, luoghi, tecnici, loading: loadingAnagrafiche, error: errorAnagrafiche } = useData();

  const anagrafiche = useMemo(() => [
    ...navi.map(n => ({...n, tipo: 'nave'})),
    ...luoghi.map(l => ({...l, tipo: 'luogo'}))
  ], [navi, luoghi]);

  // 1. Ascolta i check-in di oggi dalla collezione corretta
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkinsRef = collection(db, 'checkin_giornalieri'); // NOME COLLEZIONE CORRETTO
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
      console.error("Error fetching check-ins: ", error);
      setErrorCheckins("Errore nel caricamento dei check-in.");
      setLoadingCheckins(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Mappe per ricerca efficiente
  const anagraficheMap = useMemo(() => new Map(anagrafiche.map(a => [a.id, a.nome])), [anagrafiche]);
  const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, `${t.nome} ${t.cognome}`])), [tecnici]);

  // 3. Applica filtri
  const filteredCheckins = useMemo(() => {
      let result = checkins;
      if (filtroNome) {
        result = result.filter(c => tecniciMap.get(c.tecnicoId)?.toLowerCase().includes(filtroNome.toLowerCase()));
      }
      if (filtroAnagrafica) {
        result = result.filter(c => c.anagraficaId === filtroAnagrafica);
      }
      return result;
  }, [checkins, filtroNome, filtroAnagrafica, tecniciMap]);

  // 4. Aggrega i dati per la visualizzazione
  const aggregatedData = useMemo(() => {
      return filteredCheckins.reduce((acc, current) => {
        const anagraficaNome = anagraficheMap.get(current.anagraficaId) || 'Sconosciuto';
        const tecnicoNome = tecniciMap.get(current.tecnicoId) || 'Sconosciuto';

        if (!acc[anagraficaNome]) {
          acc[anagraficaNome] = { count: 0, tecnici: new Set() };
        }
        acc[anagraficaNome].count += 1;
        acc[anagraficaNome].tecnici.add(tecnicoNome);
        return acc;
      }, {} as AggregatedData);
  }, [filteredCheckins, anagraficheMap, tecniciMap]);

  const todayFormatted = new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loadingAnagrafiche || loadingCheckins) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
  }
  if (errorAnagrafiche || errorCheckins) {
      return <Alert severity="error">{errorAnagrafiche || errorCheckins}</Alert>
  }

  return (
      <Box>
        <Typography variant="h5" gutterBottom>
            Check-in del {todayFormatted}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
            Visualizza i check-in giornalieri dei tecnici e filtra per nome o anagrafica.
        </Typography>

        <Paper sx={{ p: 2, mb: 3}} variant="outlined">
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Filtra per nome tecnico" variant="outlined" value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Filtra per Nave/Luogo</InputLabel>
                        <Select value={filtroAnagrafica} label="Filtra per Nave/Luogo" onChange={(e) => setFiltroAnagrafica(e.target.value as string)}>
                            <MenuItem value=""><em>Tutte</em></MenuItem>
                            {anagrafiche.map(a => (<MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Paper>

        {Object.keys(aggregatedData).length > 0 ? (
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
            <Typography sx={{textAlign: 'center', p: 4, color: 'text.secondary'}}>Nessun check-in trovato per la data o i filtri selezionati.</Typography>
        )}
      </Box>
  );
}

export default CheckinSection;
