
import React, { useState, useMemo } from 'react';
import { Container, Typography, Box, Paper, Grid, CircularProgress, Alert } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

import CheckinFilters from '@/components/CheckinFilters';
import CheckinVisivo from '@/components/CheckinVisivo';

import { useCheckinData } from '@/hooks/useCheckinData';
import { useAnagrafiche } from '@/hooks/useAnagrafiche'; // 1. Importa l'hook delle anagrafiche
import dayjs from 'dayjs';

const PresenzePage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());

    const formattedDate = useMemo(() => {
        return selectedDate ? selectedDate.format('YYYY-MM-DD') : '';
    }, [selectedDate]);

    // 2. Carica le anagrafiche per i filtri
    const { tecnici, luoghi, navi, loading: anagraficheLoading, error: anagraficheError } = useAnagrafiche();

    // 3. L'hook principale per i dati dei check-in rimane invariato
    const { filteredCheckins, loading: checkinsLoading, error: checkinsError, filtri, setFiltri } = useCheckinData(formattedDate);

    // Combina gli stati di caricamento
    const loading = anagraficheLoading || checkinsLoading;
    const error = anagraficheError || checkinsError;

    const noCheckinsFoundMessage = () => {
        const hasActiveFilters = filtri.ricercaTecnico || filtri.luoghiSelezionati.length > 0 || filtri.naviSelezionate.length > 0;
        return hasActiveFilters ? "Nessun check-in trovato per i filtri selezionati." : "Nessun check-in trovato per la data selezionata.";
    }

    return (
        <Container maxWidth="xl" sx={{ pt: 2 }}>
            <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                         <DatePicker
                            label="Seleziona Data"
                            value={selectedDate}
                            onChange={(newDate) => setSelectedDate(newDate)}
                            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                        />
                    </Grid>
                    <Grid item xs={12} md={9}>
                        {/* 4. Passa le anagrafiche caricate al componente dei filtri */}
                        <CheckinFilters 
                            filtri={filtri} 
                            onFilterChange={setFiltri} 
                            tecnici={tecnici} 
                            luoghi={luoghi} 
                            navi={navi} 
                        />
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
            ) : error ? (
                <Alert severity="error">{`Si è verificato un errore: ${error.message}`}</Alert>
            ) : filteredCheckins.length > 0 ? (
                <CheckinVisivo checkins={filteredCheckins} loading={false} error={null} />
            ) : (
                <Paper sx={{ p: 4, mt: 2, textAlign: 'center' }} variant="outlined">
                    <Typography variant="h6" color="text.secondary">
                        {noCheckinsFoundMessage()}
                    </Typography>
                </Paper>
            )}
        </Container>
    );
};

export default PresenzePage;
