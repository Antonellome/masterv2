
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Paper, Typography, Button, Box,
    Grid, TextField, Autocomplete
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import AddIcon from '@mui/icons-material/Add';

import { useGlobalStore } from '@/stores/globalStore';
import { Rapportino } from '@/models/definitions';
import RapportiniTable from '@/components/Rapportini/RapportiniTable';

dayjs.locale('it');

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnicoId: string | null;
    naveId: string | null;
    clienteId: string | null;
}

// =============================================================================
// VERSIONE SEMPLIFICATA: Gestisce solo filtri e navigazione.
// La tabella è ora autonoma.
// =============================================================================
const RapportiniListPage = () => {
    const navigate = useNavigate();
    
    // Carica solo i dati necessari per i filtri e la lista di rapportini
    const {
        rapportini,
        tecnici,
        clienti,
        navi,
    } = useGlobalStore(state => ({
        rapportini: state.rapportini,
        tecnici: state.tecnici,
        clienti: state.clienti,
        navi: state.navi,
    }));

    const [filters, setFilters] = useState<FilterState>({
        dataDa: dayjs().subtract(3, 'month').startOf('month'), 
        dataA: dayjs().endOf('month'), 
        tecnicoId: null, 
        naveId: null, 
        clienteId: null,
    });

    const handleFilterChange = <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const resetFilters = useCallback(() => {
        setFilters({
            dataDa: dayjs().subtract(3, 'month').startOf('month'), 
            dataA: dayjs().endOf('month'), 
            tecnicoId: null, naveId: null, clienteId: null
        });
    }, []);

    const filteredRapportini = useMemo(() => {
        if (!rapportini) return [];
        return rapportini.filter(r => {
            // La data viene normalizzata prima del confronto
            const rapportinoDate = dayjs(r.dataInizio?.toDate ? r.dataInizio.toDate() : r.dataInizio);
            if (filters.dataDa && rapportinoDate.isBefore(filters.dataDa, 'day')) return false;
            if (filters.dataA && rapportinoDate.isAfter(filters.dataA, 'day')) return false;
            if (filters.tecnicoId && r.tecnicoId !== filters.tecnicoId && !r.presenze?.includes(filters.tecnicoId)) return false;
            if (filters.naveId && r.naveId !== filters.naveId) return false;
            if (filters.clienteId && r.clienteId !== filters.clienteId) return false;
            return true;
        });
    }, [rapportini, filters]);
    
    // Handler per le azioni della tabella
    const handleEdit = useCallback((rapportino: Rapportino) => navigate(`/rapportino/edit/${rapportino.id}`), [navigate]);
    const handleDelete = useCallback((idToDelete: string) => { /* Logica eliminata per brevità */ }, []);
    const handlePrint = useCallback((rapportino: Rapportino) => { /* Logica eliminata per brevità */ }, []);

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
                <Typography variant="h6" gutterBottom>Filtri Ricerca</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Dal" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Al" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete options={tecnici} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={tecnici.find(t => t.id === filters.tecnicoId) || null} onChange={(_, v) => handleFilterChange('tecnicoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tecnico" variant="outlined" />} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete options={clienti} getOptionLabel={o => o.nome || ''} value={clienti.find(c => c.id === filters.clienteId) || null} onChange={(_, v) => handleFilterChange('clienteId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Cliente" variant="outlined" />} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete options={navi} getOptionLabel={o => o.nome || ''} value={navi.find(n => n.id === filters.naveId) || null} onChange={(_, v) => handleFilterChange('naveId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Nave" variant="outlined" />} /></Grid>
                    <Grid item xs={12} sm={6} md={3} display="flex" justifyContent="flex-end"><Button onClick={resetFilters} variant="outlined" size="large">Azzera</Button></Grid>
                </Grid>
            </Paper>

            <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <RapportiniTable 
                    rapportini={filteredRapportini}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPrint={handlePrint}
                />
            </Paper>
        </Box>
      </LocalizationProvider>
  );
};

export default RapportiniListPage;
