
import { useMemo, useState, useEffect } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Card, CardContent, Tabs, Tab,
    List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Select, MenuItem, FormControl, InputLabel, Stack, 
    Accordion, AccordionSummary, AccordionDetails,
    ToggleButtonGroup, ToggleButton,
    Grid,
    Paper // <-- HO AGGIUNTO QUESTO
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Rapportino, Tecnico, Nave, Luogo, Checkin, Cliente, TipoGiornata } from '../models/definitions';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WorkIcon from '@mui/icons-material/Work';
import { useAnagrafiche } from '@/hooks/useAnagrafiche';
import { parseToDayjs } from '@/utils/dateUtils';
import { processaPresenze } from '@/utils/presenzeUtils';
import { TimelineBar } from '@/components/presenze/Timeline';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.locale('it');

const calculateRapportinoHours = (rapportino: Rapportino): number => {
    let totalHours = 0;
    if (rapportino.dettaglioOreTecnici && rapportino.dettaglioOreTecnici.length > 0) {
        rapportino.dettaglioOreTecnici.forEach(detail => {
            totalHours += detail.ore || 0;
        });
    } else if (rapportino.oreLavoro) {
        totalHours = rapportino.oreLavoro;
    }
    return totalHours;
};

const CalendarDayCard: React.FC<{ day: number; missingReports: number; isFuture: boolean; }> = ({ day, missingReports, isFuture }) => {
    const cardColor = isFuture ? 'grey.600' : (missingReports > 0 ? 'error.light' : 'success.light');
    const textColor = isFuture || missingReports > 0 ? 'white' : 'inherit';
    return (
        <Card sx={{ height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: cardColor }}>
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
    <Card sx={{ height: '100%' }}><CardContent>
        <Typography color="text.secondary" gutterBottom>{title}</Typography>
        <Typography variant="h5" component="div" sx={{ color: color || 'primary.main', fontWeight: 'bold' }}>{value}</Typography>
    </CardContent></Card>
);

const CustomTabPanel: React.FC<{ children?: React.ReactNode; index: number; value: number; }> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}</div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <Card sx={{ p: 1, boxShadow: 3, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{label}</Typography>
                <Typography variant="body2" color="primary">{`Ore lavorate: ${payload[0].value}`}</Typography>
            </Card>
        );
    }
    return null;
};

const PresenzeOggiCompatte = () => {
    const allCheckins = useLiveQuery(() => db.checkins.toArray(), []);
    const { navi, luoghi, loading, error } = useAnagrafiche();

    const timelineDataOggi = useMemo(() => {
        if (!allCheckins || loading) return [];
        const oggi = dayjs().format('YYYY-MM-DD');
        return processaPresenze(allCheckins).filter(item => item.data === oggi);
    }, [allCheckins, loading]);

    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">Errore caricamento anagrafiche.</Alert>;
    if (timelineDataOggi.length === 0) {
        return <Typography sx={{ p: 2, textAlign: 'center', fontStyle: 'italic' }}>Nessun tecnico presente oggi.</Typography>;
    }

    return (
        <Paper elevation={0} sx={{ p: 2 }}>
            {timelineDataOggi.map(item => (
                <Grid container key={item.id} alignItems="center" spacing={2} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 1 }}>
                    <Grid item xs={12} sm={3} md={2}>
                        <Typography variant="body2" fontWeight="bold">{item.tecnicoName}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={9} md={10}>
                        <TimelineBar data={item} navi={navi || []} luoghi={luoghi || []} />
                    </Grid>
                </Grid>
            ))}
        </Paper>
    );
};

const DashboardContent = () => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const today = dayjs();

    const { tecnici, navi, luoghi, clienti, tipiGiornata, loading: lAnagrafiche, error: eAnagrafiche } = useAnagrafiche();
    const rapportini = useLiveQuery(() => db.rapportini.toArray(), []);
    
    const isLoading = lAnagrafiche || rapportini === undefined;
    const error = eAnagrafiche;

    const handleTimeRangeChange = (event: React.MouseEvent<HTMLElement>, newTimeRange: 'current' | 'previous') => {
        if (newTimeRange !== null) {
            setSelectedDate(newTimeRange === 'current' ? dayjs() : dayjs().subtract(1, 'month'));
        }
    };

    const selectedMonth = selectedDate.month();
    const selectedYear = selectedDate.year();

    const naviMap = useMemo(() => new Map(navi?.map(n => [n.id, {nome: n.nome, clienteId: n.clienteId}]) || []), [navi]);
    const luoghiMap = useMemo(() => new Map(luoghi?.map(l => [l.id, l.nome]) || []), [luoghi]);
    const simpleTecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, `${t.nome} ${t.cognome}`])), [tecnici]);
    
    const memoizedStats = useMemo(() => {
        if (!rapportini || !tecnici || !tipiGiornata || !navi || !luoghi) return null;
    
        const rapportiniWithDate = rapportini.map(r => ({ ...r, date: parseToDayjs(r.data) })).filter(r => r.date && r.date.isValid());
        const rapportiniNelRange = rapportiniWithDate.filter(r => 
            r.date.year() === selectedDate.year() && r.date.month() === selectedDate.month()
        );
    
        let oreTotaliRange = 0;
        const orePerNaveMap = new Map<string, number>();
        rapportiniNelRange.forEach(r => {
            const oreRapportino = calculateRapportinoHours(r);
            oreTotaliRange += oreRapportino;
            if (r.naveId) {
                const currentHours = orePerNaveMap.get(r.naveId) || 0;
                orePerNaveMap.set(r.naveId, currentHours + oreRapportino);
            }
        });

        const orePerNaveChartData = Array.from(orePerNaveMap.entries())
            .map(([naveId, ore]) => ({ 
                name: naviMap.get(naveId)?.nome || 'Nave non trovata', 
                ore: ore
            }))
            .sort((a, b) => b.ore - a.ore);

        const attivitaRecenti = [...rapportiniWithDate]
            .sort((a, b) => b.date.valueOf() - a.date.valueOf())
            .slice(0, 5)
            .map(r => ({
                id: r.id,
                tecnico: simpleTecniciMap.get(r.tecnicoId) || 'N/A',
                data: r.date.format('DD/MM/YYYY'),
                destinazione: r.naveId ? naviMap.get(r.naveId)?.nome : (r.luogoId ? luoghiMap.get(r.luogoId) : 'Nessuna'),
                descrizione: r.lavoroEseguito || r.descrizioneBreve || r.note || 'Nessuna descrizione'
            }));
            
        const activeTechnicians = tecnici.filter(t => t.attivo).length;
        const daysInMonth = selectedDate.daysInMonth();
        const firstDayOfMonth = selectedDate.startOf('month').day();
        const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const currentDate = selectedDate.date(day);
            const isFuture = currentDate.isAfter(today, 'day');
            let missingReports = 0;
            if (!isFuture && currentDate.day() !== 0 && currentDate.day() !== 6 && currentDate.isSameOrBefore(today, 'day')) {
                const uniqueTechnicians = new Set(
                    rapportiniWithDate
                        .filter(r => r.date.isSame(currentDate, 'day'))
                        .flatMap(r => {
                            const techs = new Set<string>();
                            if (r.tecnicoId) techs.add(r.tecnicoId);
                            if (r.dettaglioOreTecnici) r.dettaglioOreTecnici.forEach(d => { if(d.tecnicoId) techs.add(d.tecnicoId) });
                            if (r.presenze) r.presenze.forEach(p => techs.add(p));
                            return Array.from(techs);
                        })
                );
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
    }, [rapportini, tipiGiornata, tecnici, navi, luoghi, selectedDate, naviMap, luoghiMap, today, simpleTecniciMap]);
    
    if (isLoading) return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{`Errore nel caricamento dei dati: ${error.toString()}`}</Alert></Box>;
    if (!memoizedStats) return <Box sx={{ p: 3 }}><Alert severity="info">Dati in caricamento o non sufficienti per la dashboard...</Alert></Box>;
    
    const { oreTotaliRange, rapportiniCreatiRange, orePerNaveChartData, attivitaRecenti, calendarData } = memoizedStats;
    const timeRangeValue = selectedDate.isSame(dayjs(), 'month') ? 'current' : (selectedDate.isSame(dayjs().subtract(1, 'month'), 'month') ? 'previous' : null);
    
    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}><Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} aria-label="dashboard tabs" variant="scrollable" scrollButtons="auto"><Tab label="Riepilogo" /><Tab label="Attività Recenti" /><Tab label="Presenze di Oggi" /><Tab label="Rapportini Mancanti" /></Tabs></Box>
            <CustomTabPanel value={tabValue} index={0}>
                <Stack spacing={3} sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <ToggleButtonGroup value={timeRangeValue} exclusive onChange={handleTimeRangeChange} aria-label="seleziona periodo">
                            <ToggleButton value="current" aria-label="mese corrente">Mese Corrente</ToggleButton>
                            <ToggleButton value="previous" aria-label="mese precedente">Mese Precedente</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}><StatCard title="Ore Lavorate" value={oreTotaliRange} /></Grid>
                        <Grid item xs={12} sm={6}><StatCard title="Rapportini Creati" value={rapportiniCreatiRange} /></Grid>
                        <Grid item xs={12}><Card><CardContent>
                            <Typography variant="subtitle1" gutterBottom>Ore Lavorate per Nave</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={orePerNaveChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(136, 132, 216, 0.2)' }} />
                                    <Legend verticalAlign="top" />
                                    <Bar dataKey="ore" fill="#8884d8" name="Ore lavorate" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent></Card></Grid>
                    </Grid>
                </Stack>
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={1}><Card><CardContent>
                <Typography variant="subtitle1" gutterBottom>Ultime 5 Attività</Typography>
                <List>{attivitaRecenti.length > 0 ? attivitaRecenti.map(item => <ListItem key={item.id}><ListItemAvatar><Avatar><WorkIcon /></Avatar></ListItemAvatar><ListItemText primary={`${item.tecnico} - ${item.destinazione}`} secondary={`${item.data} - ${item.descrizione}`} /></ListItem>) : <Typography sx={{ p: 2 }}>Nessuna attività recente.</Typography>}</List>
            </CardContent></Card></CustomTabPanel>
            <CustomTabPanel value={tabValue} index={2}>
                <PresenzeOggiCompatte />
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={3}>
                <Stack direction="row" spacing={2} sx={{ mb: 3, justifyContent: 'center' }}>
                    <FormControl size="small"><InputLabel>Mese</InputLabel><Select value={selectedMonth} label="Mese" onChange={(e) => setSelectedDate(selectedDate.month(e.target.value as number))}>{Array.from({ length: 12 }, (_, i) => <MenuItem key={i} value={i}>{dayjs().month(i).format('MMMM')}</MenuItem>)}</Select></FormControl>
                    <FormControl size="small"><InputLabel>Anno</InputLabel><Select value={selectedYear} label="Anno" onChange={(e) => setSelectedDate(selectedDate.year(e.target.value as number))}>{Array.from({ length: 5 }, (_, i) => dayjs().year() - i).map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</Select></FormControl>
                </Stack>
                <Grid container spacing={1}>{calendarData && Array.from({ length: calendarData.offset }).map((_, index) => <Grid item xs={12/7} key={`offset-${index}`} />)}{calendarData && calendarData.days.map((dayData) => <Grid item xs={12/7} key={dayData.day}><CalendarDayCard day={dayData.day} missingReports={dayData.missingReports} isFuture={dayData.isFuture} /></Grid>)}</Grid>
            </CustomTabPanel>
        </Box>
    );
};

const DashboardPage = () => {
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
