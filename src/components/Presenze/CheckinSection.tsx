
import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, Grid, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert } from '@mui/material';
import { useGlobalStore } from '@/stores/globalStore';
import { Checkin } from '@/models/definitions';
import dayjs from 'dayjs';

interface AggregatedData {
    [key: string]: {
        count: number;
        tecnici: Set<string>;
    };
}

const CheckinSection: React.FC = () => {
    const [filtroNome, setFiltroNome] = useState('');
    const [filtroAnagrafica, setFiltroAnagrafica] = useState('');

    const {
        navi,
        luoghi,
        tecniciMap,
        checkins: allCheckins,
        areAnagraficheLoading: loadingAnagrafiche,
    } = useGlobalStore(state => ({
        navi: state.navi,
        luoghi: state.luoghi,
        tecniciMap: state.tecniciMap,
        checkins: state.checkins,
        areAnagraficheLoading: state.areAnagraficheLoading,
    }));

    const anagrafiche = useMemo(() => [
        ...navi.map(n => ({ id: n.id, nome: n.nome, tipo: 'nave' })),
        ...luoghi.map(l => ({ id: l.id, nome: l.nome, tipo: 'luogo' }))
    ].sort((a,b) => a.nome.localeCompare(b.nome)), [navi, luoghi]);

    // 1. Filtra i checkin di oggi DIRETTAMENTE dallo store
    const checkinsDiOggi = useMemo(() => {
        return allCheckins.filter(c => dayjs(c.data).isSame(dayjs(), 'day'));
    }, [allCheckins]);

    const anagraficheMap = useMemo(() => new Map(anagrafiche.map(a => [a.id, a.nome])), [anagrafiche]);

    // 2. Applica filtri di UI
    const filteredCheckins = useMemo(() => {
        let result = checkinsDiOggi;
        if (filtroNome) {
            result = result.filter(c => tecniciMap.get(c.tecnicoId)?.toLowerCase().includes(filtroNome.toLowerCase()));
        }
        if (filtroAnagrafica) {
            result = result.filter(c => c.anagraficaId === filtroAnagrafica);
        }
        return result;
    }, [checkinsDiOggi, filtroNome, filtroAnagrafica, tecniciMap]);

    // 3. Aggrega i dati per la visualizzazione
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

    if (loadingAnagrafiche) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
    }

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Check-in del {todayFormatted}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Visualizza i check-in giornalieri dei tecnici e filtra per nome o anagrafica.
            </Typography>

            <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
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
                    {Object.entries(aggregatedData).sort((a,b) => a[0].localeCompare(b[0])).map(([anagrafica, data]) => (
                        <Paper key={anagrafica} sx={{ p: 2, mb: 2 }} variant="outlined">
                            <Typography variant="h6">{anagrafica} - {data.count} {data.count > 1 ? 'tecnici' : 'tecnico'}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {Array.from(data.tecnici).join(', ')}
                            </Typography>
                        </Paper>
                    ))}
                </Box>
            ) : (
                <Paper sx={{textAlign: 'center', p: 4}} variant="outlined">
                     <Typography color='text.secondary'>Nessun check-in trovato per oggi.</Typography>
                </Paper>
            )}
        </Box>
    );
}

export default CheckinSection;
