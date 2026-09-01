import { useState, useMemo } from 'react';
import { Typography, Box, CircularProgress, Alert, Paper, Grid, Autocomplete, TextField, Divider } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Tecnico, Nave, Luogo } from '@/models/definitions';
import { processaPresenze, ProcessedPresenze } from '@/utils/presenzeUtils';
import TabellaOrariLavoro from '@/components/Presenze/TabellaOrariLavoro';
import TabellaInterventi from '@/components/Presenze/TabellaInterventi';

dayjs.locale('it');

const PresenzePage = () => {
    // 1. CARICAMENTO REATTIVO DEI DATI DA DEXIE
    const checkins = useLiveQuery(() => db.checkins.toArray(), []);
    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const navi = useLiveQuery(() => db.navi.toArray(), []);
    const luoghi = useLiveQuery(() => db.luoghi.toArray(), []);

    const isLoading = !checkins || !tecnici || !navi || !luoghi;

    // 2. STATO DEI FILTRI (invariato)
    const [dataInizio, setDataInizio] = useState<Dayjs | null>(dayjs().startOf('month'));
    const [dataFine, setDataFine] = useState<Dayjs | null>(dayjs().endOf('month'));
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [selectedNave, setSelectedNave] = useState<Nave | null>(null);
    const [selectedLuogo, setSelectedLuogo] = useState<Luogo | null>(null);

    // 3. ELABORAZIONE DATI CON useMemo (la logica interna non cambia)
    const { orariLavoro, interventi }: ProcessedPresenze = useMemo(() => {
        if (isLoading) return { orariLavoro: [], interventi: [] };
        return processaPresenze(checkins!, navi!, luoghi!, {
            dataInizio: dataInizio,
            dataFine: dataFine,
            tecnico: selectedTecnico,
            nave: selectedNave,
            luogo: selectedLuogo,
        });
    }, [isLoading, checkins, navi, luoghi, dataInizio, dataFine, selectedTecnico, selectedNave, selectedLuogo]);

    // Liste ordinate per i menu a tendina
    const sortedTecnici = useMemo(() => [...(tecnici || [])].sort((a, b) => a.nome.localeCompare(b.nome)), [tecnici]);
    const sortedNavi = useMemo(() => [...(navi || [])].sort((a, b) => a.nome.localeCompare(b.nome)), [navi]);
    const sortedLuoghi = useMemo(() => [...(luoghi || [])].sort((a, b) => a.nome.localeCompare(b.nome)), [luoghi]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 2}}>
                <Typography variant="h5" component="h1">
                    Report Presenze
                </Typography>

                <Paper elevation={3} sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={2}>
                            <DatePicker
                                label="Data Inizio"
                                value={dataInizio}
                                onChange={(newValue) => setDataInizio(newValue)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <DatePicker
                                label="Data Fine"
                                value={dataFine}
                                onChange={(newValue) => setDataFine(newValue)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4} md={3}>
                            <Autocomplete
                                options={sortedTecnici}
                                getOptionLabel={(option) => option.nome}
                                value={selectedTecnico}
                                onChange={(_, newValue) => setSelectedTecnico(newValue)}
                                renderInput={(params) => <TextField {...params} label="Filtra per Tecnico" />}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4} md={2}>
                            <Autocomplete
                                options={sortedNavi}
                                getOptionLabel={(option) => option.nome}
                                value={selectedNave}
                                onChange={(_, newValue) => setSelectedNave(newValue)}
                                renderInput={(params) => <TextField {...params} label="Filtra per Nave" />}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4} md={3}>
                            <Autocomplete
                                options={sortedLuoghi}
                                getOptionLabel={(option) => option.nome}
                                value={selectedLuogo}
                                onChange={(_, newValue) => setSelectedLuogo(newValue)}
                                renderInput={(params) => <TextField {...params} label="Filtra per Luogo" />}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>Orario di Lavoro Giornaliero</Typography>
                            <TabellaOrariLavoro rows={orariLavoro} />
                        </Box>
                        <Divider />
                        <Box>
                             <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>Interventi su Luoghi/Navi</Typography>
                             <TabellaInterventi rows={interventi} />
                        </Box>
                    </Paper>
                )}

            </Box>
        </LocalizationProvider>
    );
};

export default PresenzePage;
