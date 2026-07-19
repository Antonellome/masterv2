
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Paper, Typography, Button, Box,
    Grid, TextField, Autocomplete, Alert
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import AddIcon from '@mui/icons-material/Add';

// AGGIORNAMENTO: Importiamo gli hook corretti
import { useCollectionData } from '@/hooks/useCollectionData';
import { useAnagraficaData } from '@/contexts/DataContext';

import { Rapportino, Tecnico, Nave, Luogo, Cliente, TipoGiornata } from '@/models/definitions';
import RapportiniTable from '@/components/Rapportini/RapportiniTable'; // Importiamo la nuova tabella

dayjs.locale('it');

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnicoId: string | null;
    naveId: string | null;
    luogoId: string | null;
    clienteId: string | null;
    tipoGiornataId: string | null;
}

const RapportiniListPage = () => {
    const navigate = useNavigate();
    
    // --- NUOVA GESTIONE DATI ---
    // 1. Carichiamo i rapportini dal DB locale (Dexie)
    const { data: rapportini, loading: loadingRapportini, error: errorRapportini } = useCollectionData<Rapportino>('rapportini');
    // 2. Carichiamo le anagrafiche dal Context (che ora usa Dexie)
    const { tecnici, clienti, navi, luoghi, tipiGiornata, loading: loadingAnagrafiche, error: errorAnagrafiche } = useAnagraficaData();
    // --- FINE NUOVA GESTIONE DATI ---

    const [filters, setFilters] = useState<FilterState>({
        dataDa: dayjs().startOf('month'), 
        dataA: dayjs().endOf('month'), 
        tecnicoId: null, naveId: null, luogoId: null, clienteId: null, tipoGiornataId: null
    });

    const handleFilterChange = <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const resetFilters = useCallback(() => {
        setFilters({
            dataDa: dayjs().startOf('month'), dataA: dayjs().endOf('month'), 
            tecnicoId: null, naveId: null, luogoId: null, clienteId: null, tipoGiornataId: null
        });
    }, []);

    const filteredRapportini = useMemo(() => {
        if (!rapportini) return [];

        return rapportini.filter(r => {
            const rapportinoDate = dayjs(r.dataInizio.toDate());
            if (filters.dataDa && rapportinoDate.isBefore(filters.dataDa, 'day')) return false;
            if (filters.dataA && rapportinoDate.isAfter(filters.dataA, 'day')) return false;
            if (filters.tecnicoId && !r.presenze?.includes(filters.tecnicoId)) return false;
            if (filters.naveId && r.naveId !== filters.naveId) return false;
            if (filters.luogoId && r.luogoId !== filters.luogoId) return false;
            if (filters.clienteId && r.clienteId !== filters.clienteId) return false;
            if (filters.tipoGiornataId && r.tipoGiornataId !== filters.tipoGiornataId) return false;
            return true;
        });
    }, [rapportini, filters]);
    
    const handleEdit = useCallback((rapportino: Rapportino) => {
        navigate(`/rapportino/edit/${rapportino.id}`);
    }, [navigate]);

    const loading = loadingRapportini || loadingAnagrafiche;
    const error = errorRapportini || errorAnagrafiche;

    if (error) {
        return <Alert severity="error">Si è verificato un errore nel caricamento dei dati: {error.message}</Alert>;
    }

    return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">Elenco Rapportini</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/rapportino/edit/new')}>
                    Nuovo Rapportino
                </Button>
            </Box>

            <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>Filtri</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Dal" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Al" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete options={tecnici} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={tecnici.find(t => t.id === filters.tecnicoId) || null} onChange={(_, v) => handleFilterChange('tecnicoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tecnico" variant="outlined" />} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete options={clienti} getOptionLabel={o => o.nome || ''} value={clienti.find(c => c.id === filters.clienteId) || null} onChange={(_, v) => handleFilterChange('clienteId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Cliente" variant="outlined" />} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete options={navi} getOptionLabel={o => o.nome || ''} value={navi.find(n => n.id === filters.naveId) || null} onChange={(_, v) => handleFilterChange('naveId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Nave" variant="outlined" />} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete options={luoghi} getOptionLabel={o => o.nome || ''} value={luoghi.find(l => l.id === filters.luogoId) || null} onChange={(_, v) => handleFilterChange('luogoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Luogo" variant="outlined" />} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete options={tipiGiornata} getOptionLabel={o => o.nome || ''} value={tipiGiornata.find(tg => tg.id === filters.tipoGiornataId) || null} onChange={(_, v) => handleFilterChange('tipoGiornataId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" variant="outlined" />} /></Grid>
                    <Grid item xs={12} sm={6} md={3} display="flex" justifyContent="flex-end"><Button onClick={resetFilters} variant="outlined" size="large">Azzera Filtri</Button></Grid>
                </Grid>
            </Paper>

            <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <RapportiniTable 
                    rapportini={filteredRapportini}
                    loading={loading}
                    onEdit={handleEdit}
                />
            </Paper>
        </Box>
      </LocalizationProvider>
  );
};

export default RapportiniListPage;
