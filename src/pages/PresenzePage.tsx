
import { useState, useMemo } from 'react';
import { Typography, Box, CircularProgress, Paper, Grid, Autocomplete, TextField } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Tecnico } from '@/models/definitions';
import { processaPresenze } from '@/utils/presenzeUtils';
import { TimelineBar, OrariList } from '@/components/presenze/Timeline';

dayjs.locale('it');

const PresenzePage = () => {
    const allCheckins = useLiveQuery(() => db.checkins.toArray(), []);
    const allTecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const allNavi = useLiveQuery(() => db.navi.toArray(), []);
    const allLuoghi = useLiveQuery(() => db.luoghi.toArray(), []);

    const isLoading = !allCheckins || !allTecnici || !allNavi || !allLuoghi;

    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);

    const timelineData = useMemo(() => {
        if (isLoading) return [];
        const processed = processaPresenze(allCheckins!);
        return processed.filter(item => {
            const dataMatch = selectedDate ? item.data === selectedDate.format('YYYY-MM-DD') : true;
            const tecnicoMatch = selectedTecnico ? item.tecnicoId === selectedTecnico.id : true;
            return dataMatch && tecnicoMatch;
        });
    }, [isLoading, allCheckins, selectedDate, selectedTecnico]);
    
    const sortedTecnici = useMemo(() => [...(allTecnici || [])].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || '') || (a.nome || '').localeCompare(b.nome || '')), [allTecnici]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 2}}>
                <Typography variant="h5" component="h1">Timeline Presenze Multi-Sessione</Typography>

                <Paper elevation={3} sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <DatePicker label="Data" value={selectedDate} onChange={setSelectedDate} sx={{ width: '100%' }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                options={sortedTecnici}
                                getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                                value={selectedTecnico}
                                onChange={(_, newValue) => setSelectedTecnico(newValue)}
                                renderInput={(params) => <TextField {...params} label="Filtra per Tecnico" />}
                                noOptionsText="Nessun tecnico trovato"
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {timelineData.length > 0 ? timelineData.map(item => (
                             <Grid container key={item.id} alignItems="center" spacing={2} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 1 }}>
                                <Grid item xs={12} sm={4} md={3}>
                                     <Typography variant="body2" fontWeight="bold">{item.tecnicoName}</Typography>
                                     <OrariList sessioni={item.sessioniLavoro} />
                                </Grid>
                                <Grid item xs={12} sm={8} md={9}>
                                     <TimelineBar data={item} navi={allNavi!} luoghi={allLuoghi!} />
                                </Grid>
                            </Grid>
                        )) : (
                            <Typography sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
                                Nessuna presenza trovata per i filtri selezionati.
                            </Typography>
                        )}
                    </Paper>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default PresenzePage;
