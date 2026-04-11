
import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Grid, TextField, CircularProgress, Alert } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

import CheckinFilters from '@/components/CheckinFilters';
import CheckinVisivo from '@/components/CheckinVisivo';

import { useData } from '@/hooks/useData';
import { useFilteredCheckins } from '@/hooks/useFilteredCheckins';
import dayjs from 'dayjs';

const PresenzePage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());
    const { checkins, loading, error } = useData(selectedDate.toDate());
    const { filtri, setFiltri, checkinsFiltrati } = useFilteredCheckins(checkins);

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
                        <CheckinFilters filtri={filtri} onFilterChange={setFiltri} />
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : checkinsFiltrati && checkinsFiltrati.length > 0 ? (
                <CheckinVisivo checkins={checkinsFiltrati} loading={loading} error={error} />
            ) : (
                <Paper sx={{ p: 4, mt: 2, textAlign: 'center' }} variant="outlined">
                    <Typography variant="h6" color="text.secondary">
                       Nessun check-in da visualizzare per i filtri selezionati.
                    </Typography>
                </Paper>
            )}
        </Container>
    );
};

export default PresenzePage;
