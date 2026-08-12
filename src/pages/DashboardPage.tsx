
import React, { useMemo, useState, useEffect } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Card, CardContent, Tabs, Tab,
    List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Select, MenuItem, FormControl, InputLabel, Stack,
    Accordion, AccordionSummary, AccordionDetails,
    ToggleButtonGroup, ToggleButton
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import type { Rapportino, Tecnico, Checkin } from '../models/definitions';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WorkIcon from '@mui/icons-material/Work';
import ShipIcon from '@mui/icons-material/DirectionsBoat';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useGlobalStore } from '@/stores/globalStore';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.locale('it');

const calculateRapportinoHours = (rapportino: Rapportino): number => {
    if (rapportino.oreLavoro) return rapportino.oreLavoro;
    return 0;
};

const CalendarDayCard: React.FC<{ day: number; missingReports: number; isFuture: boolean; }> = ({ day, missingReports, isFuture }) => {
    const cardColor = isFuture ? 'grey.200' : (missingReports > 0 ? 'error.light' : 'success.light');
    const textColor = isFuture ? 'text.secondary' : (missingReports > 0 ? 'white' : 'inherit');
    return (
        <Card sx={{ height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: cardColor, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 1 }}>
                <Typography variant="subtitle1" sx={{ color: textColor, fontWeight: 'bold' }}>{day}</Typography>
                {!isFuture && (
                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Typography variant="h5" sx={{ color: textColor, fontWeight: 'bold' }}>{missingReports}</Typography>
                        <Typography variant="caption" display="block" sx={{ color: textColor, lineHeight: 1 }}>mancanti</Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

const StatCard: React.FC<{ title: string; value: string | number; color?: string; }> = ({ title, value, color }) => (
    <Card elevation={3} sx={{ height: '100%' }}><CardContent>
        <Typography color="text.secondary" gutterBottom>{title}</Typography>
        <Typography variant="h4" component="div" sx={{ color: color || 'primary.main', fontWeight: 'bold' }}>{value}</Typography>
    </CardContent></Card>
);

const CustomTabPanel: React.FC<{ children?: React.ReactNode; index: number; value: number; }> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}</div>
);

const LocationAccordion: React.FC<{ locations: { id: string; name: string; type: 'nave' | 'luogo'; technicians: Checkin[] }[], tecniciMap: Map<string, string> }> = ({ locations, tecniciMap }) => (
    <Box>{locations.map(({ id, name, type, technicians }) => (
        <Accordion key={id} sx={{ my: 1, boxShadow: 2, '&:before': { display: 'none' } }} >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Avatar sx={{ mr: 2, bgcolor: type === 'nave' ? 'primary.main' : 'secondary.main' }}>{type === 'nave' ? <ShipIcon /> : <LocationOnIcon />}</Avatar><Typography variant="body1" sx={{ fontWeight: 'bold', flexGrow: 1, alignSelf: 'center' }}>{name}</Typography><Typography sx={{ alignSelf: 'center', color: 'text.secondary' }}>{`${technicians.length} tecnici`}</Typography></AccordionSummary>
            <AccordionDetails sx={{ p: 0, bgcolor: 'grey.50' }}><List dense disablePadding>{technicians.map(checkin => <ListItem key={checkin.id} sx={{ pl: 4 }}><ListItemText primary={tecniciMap.get(checkin.tecnicoId) || 'ID Tecnico non trovato'} /></ListItem>)}</List></AccordionDetails>
        </Accordion>
    ))}</Box>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <Card sx={{ p: 1, boxShadow: 3, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{label}</Typography>
                <Typography variant="body2" color="primary">{`Ore lavorate: ${payload[0].value}`}</Typography>
            </Card>
        );
    }
    return null;
};

const DashboardContent = () => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const today = dayjs();

    const {
        rapportini,
        tecnici,
        tipiGiornata,
        naviMap,
        luoghiMap,
        clientiMap,
        tecniciMap,
        checkins,
        areAnagraficheLoading,
        areRapportiniLoading,
        error
    } = useGlobalStore(state => ({
        rapportini: state.rapportini,
        tecnici: state.tecnici,
        tipiGiornata: state.tipiGiornata,
        naviMap: state.naviMap,
        luoghiMap: state.luoghiMap,
        clientiMap: state.clientiMap,
        tecniciMap: state.tecniciMap,
        checkins: state.checkins,
        areAnagraficheLoading: state.areAnagraficheLoading,
        areRapportiniLoading: state.areRapportiniLoading,
        error: state.error,
    }));

    const isLoading = areAnagraficheLoading || areRapportiniLoading;

    const handleTimeRangeChange = (_: React.MouseEvent<HTMLElement>, newTimeRange: 'current' | 'previous') => {
        if (newTimeRange) {
            setSelectedDate(newTimeRange === 'current' ? dayjs() : dayjs().subtract(1, 'month'));
        }
    };

    const checkinsOggi = useMemo(() => checkins.filter(c => dayjs(c.data).isSame(today, 'day')), [checkins, today]);

    const { checkinsByClient, luoghiCheckins } = useMemo(() => {
        const locations: Record<string, { id: string; name: string; type: 'nave' | 'luogo'; technicians: Checkin[], clienteId?: string }> = {};
        for (const checkin of checkinsOggi) {
            const locationId = checkin.anagraficaId;
            if (locations[locationId]) { locations[locationId].technicians.push(checkin); continue; }
            let name: string, type: 'nave' | 'luogo', clienteId: string | undefined;
            const nave = naviMap.get(locationId);
            if (nave) {
                name = nave.nome; type = 'nave'; clienteId = nave.clienteId;
            } else {
                name = luoghiMap.get(locationId) || checkin.anagraficaNome || 'Luogo Sconosciuto'; type = 'luogo';
            }
            locations[locationId] = { id: locationId, name, type, technicians: [checkin], clienteId };
        }
        const allLocations = Object.values(locations);
        const luoghiSorted = allLocations.filter(l => l.type === 'luogo').sort((a, b) => a.name.localeCompare(b.name));
        const naviPerCliente: Record<string, { id: string; name: string; type: 'nave'; technicians: Checkin[] }[]> = {};
        allLocations.filter(l => l.type === 'nave').forEach(nave => {
            const clienteId = nave.clienteId || 'nessun-cliente';
            if (!naviPerCliente[clienteId]) naviPerCliente[clienteId] = [];
            naviPerCliente[clienteId].push(nave as any);
        });
        for (const clienteId in naviPerCliente) {
            naviPerCliente[clienteId].sort((a,b) => a.name.localeCompare(b.name));
            naviPerCliente[clienteId].forEach(nave => nave.technicians.sort((a, b) => (tecniciMap.get(a.tecnicoId) || '').localeCompare(tecniciMap.get(b.tecnicoId) || '')));
        }
        luoghiSorted.forEach(luogo => luogo.technicians.sort((a,b) => (tecniciMap.get(a.tecnicoId) || '').localeCompare(tecniciMap.get(b.tecnicoId) || '')));
        return { checkinsByClient: naviPerCliente, luoghiCheckins: luoghiSorted };
    }, [checkinsOggi, naviMap, luoghiMap, tecniciMap]);

    const memoizedStats = useMemo(() => {
        const rapportiniWithDate = rapportini.map(r => ({ ...r, date: dayjs(r.dataInizio) })).filter(r => r.date.isValid());
        const rapportiniNelRange = rapportiniWithDate.filter(r => r.date.isSame(selectedDate, 'month'));

        let oreTotaliRange = 0;
        const orePerNaveMap = new Map<string, number>();

        rapportiniNelRange.forEach(r => {
            const oreRapportino = calculateRapportinoHours(r);
            oreTotaliRange += oreRapportino;
            if (r.naveId) {
                orePerNaveMap.set(r.naveId, (orePerNaveMap.get(r.naveId) || 0) + oreRapportino);
            }
        });

        const orePerNaveChartData = Array.from(orePerNaveMap.entries()).map(([naveId, ore]) => ({ name: naviMap.get(naveId)?.nome || 'N/A', ore })).sort((a, b) => b.ore - a.ore);
        const attivitaRecenti = [...rapportiniWithDate].sort((a, b) => b.date.valueOf() - a.date.valueOf()).slice(0, 5).map(r => ({
            id: r.id,
            tecnico: tecniciMap.get(r.tecnicoId) || 'N/A',
            data: r.date.format('DD/MM/YYYY'),
            destinazione: r.naveId ? naviMap.get(r.naveId)?.nome : (r.luogoId ? luoghiMap.get(r.luogoId) : 'N/D'),
            descrizione: r.lavoroEseguito || r.descrizioneBreve || 'N/D'
        }));

        const activeTechnicians = tecnici.filter(t => t.attivo).length;
        const daysInMonth = selectedDate.daysInMonth();
        const firstDayOfMonth = selectedDate.startOf('month').day();
        const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const currentDate = selectedDate.date(day);
            const isFuture = currentDate.isAfter(today, 'day');
            let missingReports = 0;
            if (!isFuture && ![0, 6].includes(currentDate.day()) && currentDate.isSameOrBefore(today, 'day')) {
                const uniqueTechnicians = new Set(rapportiniWithDate.filter(r => r.date.isSame(currentDate, 'day')).flatMap(r => r.presenze || [r.tecnicoId]));
                missingReports = activeTechnicians - uniqueTechnicians.size;
            }
            return { day, missingReports: Math.max(0, missingReports), isFuture };
        });

        return {
            oreTotaliRange: oreTotaliRange.toFixed(1),
            rapportiniCreatiRange: rapportiniNelRange.length,
            orePerNaveChartData,
            attivitaRecenti,
            calendarData: { days: calendarDays, offset: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) },
        };
    }, [rapportini, tipiGiornata, tecnici, naviMap, luoghiMap, selectedDate, today, tecniciMap]);

    if (isLoading) return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{`Errore nel caricamento dei dati: ${error}`}</Alert></Box>;

    const { oreTotaliRange, rapportiniCreatiRange, orePerNaveChartData, attivitaRecenti, calendarData } = memoizedStats;
    const clientKeys = Object.keys(checkinsByClient).sort((a, b) => (clientiMap.get(a) || 'zzz').localeCompare(clientiMap.get(b) || 'zzz'));
    const timeRangeValue = selectedDate.isSame(dayjs(), 'month') ? 'current' : null;
    const titleSuffix = timeRangeValue === 'current' ? '(Mese Corrente)' : `(${selectedDate.format('MMMM YYYY')})`;

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}><Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} aria-label="dashboard tabs" variant="scrollable" scrollButtons="auto"><Tab label="Riepilogo" /><Tab label="Attività Recenti" /><Tab label="Presenze di Oggi" /><Tab label="Rapportini Mancanti" /></Tabs></Box>
            <CustomTabPanel value={tabValue} index={0}>
                <Stack spacing={3} sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}><ToggleButtonGroup value={timeRangeValue} exclusive onChange={handleTimeRangeChange}><ToggleButton value="current">Mese Corrente</ToggleButton><ToggleButton value="previous">Mese Precedente</ToggleButton></ToggleButtonGroup></Box>
                    <Grid container spacing={3}>
                        <Grid xs={12} md={6}><StatCard title={`Ore Lavorate ${titleSuffix}`} value={oreTotaliRange} /></Grid>
                        <Grid xs={12} md={6}><StatCard title={`Rapportini Creati ${titleSuffix}`} value={rapportiniCreatiRange} /></Grid>
                        <Grid xs={12}><Card elevation={3}><CardContent>
                            <Typography variant="h6" gutterBottom>Ore Lavorate per Nave {titleSuffix}</Typography>
                            <ResponsiveContainer width="100%" height={300}><BarChart data={orePerNaveChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} /><YAxis /><Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(136, 132, 216, 0.2)' }} /><Legend verticalAlign="top" /><Bar dataKey="ore" fill="#8884d8" name="Ore lavorate" /></BarChart></ResponsiveContainer>
                        </CardContent></Card></Grid>
                    </Grid>
                </Stack>
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={1}><Card elevation={3}><CardContent>
                <Typography variant="h6" gutterBottom>Ultime 5 Attività</Typography>
                <List>{attivitaRecenti.length > 0 ? attivitaRecenti.map(item => <ListItem key={item.id}><ListItemAvatar><Avatar><WorkIcon /></Avatar></ListItemAvatar><ListItemText primary={`${item.tecnico} - ${item.destinazione}`} secondary={`${item.data} - ${item.descrizione}`} /></ListItem>) : <Typography sx={{ p: 2 }}>Nessuna attività recente.</Typography>}</List>
            </CardContent></Card></CustomTabPanel>
            <CustomTabPanel value={tabValue} index={2}>
                {checkinsOggi.length > 0 ? (
                    <Grid container spacing={4}>
                        <Grid xs={12} md={6}><Typography variant="h6" gutterBottom>Navi per Cliente</Typography>{Object.keys(checkinsByClient).length > 0 ? clientKeys.map(clienteId => <Box key={clienteId} sx={{ mb: 3 }}><Typography variant="subtitle1" sx={{ mb: 1, pl: 1, fontWeight: 'bold' }}>{clientiMap.get(clienteId) || 'N/D'}</Typography><LocationAccordion locations={checkinsByClient[clienteId]} tecniciMap={tecniciMap} /></Box>) : <Typography sx={{ p: 2, fontStyle: 'italic' }}>Nessun tecnico imbarcato.</Typography>}</Grid>
                        <Grid xs={12} md={6}><Typography variant="h6" gutterBottom>Luoghi</Typography>{luoghiCheckins.length > 0 ? <LocationAccordion locations={luoghiCheckins} tecniciMap={tecniciMap} /> : <Typography sx={{ p: 2, fontStyle: 'italic' }}>Nessun tecnico in altre sedi.</Typography>}</Grid>
                    </Grid>
                ) : <Alert severity="info">Nessun check-in registrato per oggi.</Alert>}
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={3}>
                <Stack direction="row" spacing={2} sx={{ mb: 3, justifyContent: 'center' }}><FormControl size="small"><InputLabel>Mese</InputLabel><Select value={selectedDate.month()} label="Mese" onChange={(e) => setSelectedDate(selectedDate.month(e.target.value as number))}>{Array.from({ length: 12 }, (_, i) => <MenuItem key={i} value={i}>{dayjs().month(i).format('MMMM')}</MenuItem>)}</Select></FormControl><FormControl size="small"><InputLabel>Anno</InputLabel><Select value={selectedDate.year()} label="Anno" onChange={(e) => setSelectedDate(selectedDate.year(e.target.value as number))}>{Array.from({ length: 5 }, (_, i) => today.year() - i).map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</Select></FormControl></Stack>
                <Grid container spacing={0.5}>{calendarData && Array.from({ length: calendarData.offset }).map((_, index) => <Grid xs={12/7} key={`offset-${index}`} />)}{calendarData && calendarData.days.map((dayData) => <Grid xs={12/7} key={dayData.day}><CalendarDayCard day={dayData.day} missingReports={dayData.missingReports} isFuture={dayData.isFuture} /></Grid>)}</Grid>
            </CustomTabPanel>
        </Box>
    );
};

const DashboardPage = () => {
    // Questo key-trick forza il re-rendering del componente quando la visibilità della pagina cambia,
    // garantendo che i dati (es. check-in di "oggi") siano sempre aggiornati.
    const [dayKey, setDayKey] = useState(dayjs().format('YYYY-MM-DD'));
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setDayKey(dayjs().format('YYYY-MM-DD'));
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);
    return <DashboardContent key={dayKey} />;
};

export default DashboardPage;
