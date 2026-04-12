// src/pages/DashboardPage.tsx
import React, { useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, Tabs, Tab, List, ListItem, ListItemText, ListItemAvatar, Avatar, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, Stack } from '@mui/material';
import Grid from '@mui/material/Grid'; // Importazione esplicita per chiarezza
import { useFirestoreData } from '@/hooks/useFirestoreData';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Rapportino, Tecnico, TipoGiornata, Nave, Luogo, Checkin } from '../models/definitions';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import isBetween from 'dayjs/plugin/isBetween';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WorkIcon from '@mui/icons-material/Work';

dayjs.extend(isBetween);
dayjs.locale('it');

// ========= COMPONENTI CALENDARIO =========
const CalendarDayCard: React.FC<{ day: number; missingReports: number; isFuture: boolean; }> = ({ day, missingReports, isFuture }) => {
    const cardColor = isFuture ? 'grey.600' : (missingReports > 0 ? 'error.light' : 'success.light');
    const textColor = isFuture || missingReports > 0 ? 'white' : 'inherit';

    return (
        <Card sx={{ height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: cardColor }}>
            <CardContent sx={{ p: 1 }}>
                <Typography variant="h6" sx={{ color: textColor, fontWeight: 'bold' }}>{day}</Typography>
                {!isFuture && (
                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Typography variant="h4" sx={{ color: textColor, fontWeight: 'bold' }}>
                            {missingReports}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ color: textColor, lineHeight: 1 }}>
                            mancanti
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

// ========= WIDGET E COMPONENTI INTERNI =========
const StatCard: React.FC<{ title: string; value: string | number; color?: string; }> = ({ title, value, color }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Typography color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h4" component="div" sx={{ color: color || 'primary.main', fontWeight: 'bold' }}>
                {value}
            </Typography>
        </CardContent>
    </Card>
);

const CustomTabPanel: React.FC<{ children?: React.ReactNode; index: number; value: number; }> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
);

// ========= COMPONENTE PRINCIPALE DELLA DASHBOARD =========
const DashboardPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
    const [selectedYear, setSelectedYear] = useState(dayjs().year());

    // Hook per i dati principali
    const { data: rapportini, loading: lRapportini } = useFirestoreData<Rapportino>(collection(db, 'rapportini'));
    const { data: tecnici, loading: lTecnici } = useFirestoreData<Tecnico>(collection(db, 'tecnici'));
    const { data: tipiGiornata, loading: lTipiGiornata } = useFirestoreData<TipoGiornata>(collection(db, 'tipiGiornata'));
    const { data: navi, loading: lNavi } = useFirestoreData<Nave>(collection(db, 'navi'));
    const { data: luoghi, loading: lLuoghi } = useFirestoreData<Luogo>(collection(db, 'luoghi'));
    
    // NUOVO: Hook per i check-in di oggi
    const checkinsQuery = useMemo(() => {
        const startOfDay = Timestamp.fromDate(dayjs().startOf('day').toDate());
        const endOfDay = Timestamp.fromDate(dayjs().endOf('day').toDate());
        return query(
            collection(db, 'checkin_giornalieri'), 
            where('data', '>=', startOfDay),
            where('data', '<=', endOfDay)
        );
    }, []);
    const { data: checkinsOggi, loading: lCheckins } = useFirestoreData<Checkin>(checkinsQuery);

    const isLoading = lRapportini || lTecnici || lTipiGiornata || lNavi || lLuoghi || lCheckins;

    const memoizedData = useMemo(() => {
        if (isLoading || !rapportini || !tecnici || !tipiGiornata || !navi || !luoghi || !checkinsOggi) return null;

        const today = dayjs();
        const thirtyDaysAgo = today.subtract(30, 'day');
        const sevenDaysAgo = today.subtract(7, 'day');

        const tipiGiornataMap = new Map(tipiGiornata.map(tg => [tg.id, tg]));
        const tecniciMap = new Map(tecnici.map(t => [t.id, `${t.nome} ${t.cognome}`]));
        const naviMap = new Map(navi.map(n => [n.id, n.nome]));
        const luoghiMap = new Map(luoghi.map(l => [l.id, l.nome]));

        const rapportiniWithDate = rapportini.map(r => ({ ...r, date: dayjs((r.data as any).toDate()) }));

        const rapportiniUltimi30Giorni = rapportiniWithDate.filter(r => r.date.isAfter(thirtyDaysAgo));
        const oreTotali30 = rapportiniUltimi30Giorni.reduce((sum, r) => sum + (r.oreLavoro || 0), 0);
        const costoTotale30 = rapportiniUltimi30Giorni.reduce((sum, r) => {
            const costoOrario = tipiGiornataMap.get(r.tipoGiornataId)?.costoOrario || 0;
            return sum + (r.oreLavoro || 0) * costoOrario;
        }, 0);

        const activityLast7Days = Array.from({ length: 7 }, (_, i) => ({ date: today.subtract(6 - i, 'day').format('DD/MM'), ore: 0 }));
        rapportiniWithDate.filter(r => r.date.isAfter(sevenDaysAgo)).forEach(r => {
            const dayData = activityLast7Days.find(d => d.date === r.date.format('DD/MM'));
            if (dayData) {
                dayData.ore += r.oreLavoro || 0;
            }
        });

        const attivitaRecenti = [...rapportiniWithDate]
            .sort((a, b) => b.date.valueOf() - a.date.valueOf()).slice(0, 5)
            .map(r => ({
                id: r.id,
                tecnico: r.presenze?.map(id => tecniciMap.get(id)).join(', ') || 'N/A',
                data: r.date.format('DD/MM/YYYY'),
                destinazione: r.naveId ? naviMap.get(r.naveId) : (r.luogoId ? luoghiMap.get(r.luogoId) : 'Nessuna'),
                descrizione: r.note
            }));

        // LOGICA CORRETTA: Usa i check-in per le presenze di oggi
        const presenzeOggi = new Map<string, string>(); // Mappa per garantire l'unicità del tecnico
        checkinsOggi.forEach(c => {
            if (!presenzeOggi.has(c.tecnicoId)) {
                presenzeOggi.set(c.tecnicoId, `${c.tecnicoNome} @ ${c.anagraficaNome}`);
            }
        });

        const activeTechnicians = tecnici.filter(t => t.attivo).length;
        const currentSelection = dayjs().year(selectedYear).month(selectedMonth);
        const daysInMonth = currentSelection.daysInMonth();
        const firstDayOfMonth = currentSelection.startOf('month').day(); // 0 (Sun) - 6 (Sat), dayjs() locale dependent

        const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const currentDate = currentSelection.date(day);
            const isFuture = currentDate.isAfter(today, 'day');
            let missingReports = 0;
            if (!isFuture && currentDate.day() !== 0 && currentDate.day() !== 6) { // Non calcolare per sabato e domenica
                const uniqueTechnicians = new Set(rapportiniWithDate.filter(r => r.date.isSame(currentDate, 'day')).flatMap(r => r.presenze || []));
                missingReports = activeTechnicians - uniqueTechnicians.size;
            }
            return { day, missingReports: Math.max(0, missingReports), isFuture };
        });

        return {
            oreTotali30: oreTotali30.toFixed(1),
            costoTotale30: `€ ${costoTotale30.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            rapportiniCreati30: rapportiniUltimi30Giorni.length,
            activityLast7Days,
            attivitaRecenti,
            presenzeOggi: Array.from(presenzeOggi.values()), // Converte i valori della mappa in un array
            calendarData: { days: calendarDays, offset: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) }, // Offset corretto per la settimana che inizia di lunedì
        };
    }, [isLoading, rapportini, tecnici, tipiGiornata, navi, luoghi, checkinsOggi, selectedMonth, selectedYear]);

    if (isLoading) return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (!memoizedData) return <Box sx={{ p: 3 }}><Alert severity="warning">Dati non sufficienti per la dashboard. Verifica le anagrafiche.</Alert></Box>;

    const { oreTotali30, costoTotale30, rapportiniCreati30, activityLast7Days, attivitaRecenti, presenzeOggi, calendarData } = memoizedData;

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} aria-label="dashboard tabs">
                    <Tab label="Riepilogo" />
                    <Tab label="Attività Recenti" />
                    <Tab label="Presenze di Oggi" />
                    <Tab label="Rapportini Mancanti" />
                </Tabs>
            </Box>

            <CustomTabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}><StatCard title="Ore Lavorate (30gg)" value={oreTotali30} /></Grid>
                    <Grid item xs={12} sm={4}><StatCard title="Costo Personale (30gg)" value={costoTotale30} /></Grid>
                    <Grid item xs={12} sm={4}><StatCard title="Rapportini Creati (30gg)" value={rapportiniCreati30} /></Grid>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Attività ultima settimana (ore)</Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={activityLast7Days} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="ore" fill="#8884d8" name="Ore lavorate" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </CustomTabPanel>

            <CustomTabPanel value={tabValue} index={1}>
                <Card><CardContent>
                    <Typography variant="h6" gutterBottom>Ultime 5 Attività</Typography>
                    <List>
                        {attivitaRecenti.length > 0 ? attivitaRecenti.map(item => (
                            <ListItem key={item.id}><ListItemAvatar><Avatar><WorkIcon /></Avatar></ListItemAvatar><ListItemText primary={`${item.tecnico} - ${item.destinazione}`} secondary={`${item.data} - ${item.descrizione || 'Nessuna descrizione'}`} /></ListItem>
                        )) : <Typography sx={{ p: 2 }}>Nessuna attività recente.</Typography>}
                    </List>
                </CardContent></Card>
            </CustomTabPanel>

            <CustomTabPanel value={tabValue} index={2}>
                <Card><CardContent>
                    <Typography variant="h6" gutterBottom>Tecnici con check-in di oggi</Typography>
                    <List>
                        {presenzeOggi.length > 0 ? presenzeOggi.map((nome, index) => (
                            <ListItem key={index}><ListItemText primary={nome} /></ListItem>
                        )) : <Typography sx={{ p: 2 }}>Nessun check-in registrato per oggi.</Typography>}
                    </List>
                </CardContent></Card>
            </CustomTabPanel>

            <CustomTabPanel value={tabValue} index={3}>
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <FormControl size="small">
                        <InputLabel>Mese</InputLabel>
                        <Select value={selectedMonth} label="Mese" onChange={(e) => setSelectedMonth(e.target.value as number)}>
                            {Array.from({ length: 12 }, (_, i) => <MenuItem key={i} value={i}>{dayjs().month(i).format('MMMM')}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small">
                        <InputLabel>Anno</InputLabel>
                        <Select value={selectedYear} label="Anno" onChange={(e) => setSelectedYear(e.target.value as number)}>
                            {Array.from({ length: 5 }, (_, i) => dayjs().year() - i).map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>
                <Grid container spacing={1}>
                    {Array.from({ length: calendarData.offset }).map((_, index) => <Grid key={`offset-${index}`} item xs={12/7} />)}
                    {calendarData.days.map((dayData) => (
                        <Grid key={dayData.day} item xs={12/7}>
                            <CalendarDayCard day={dayData.day} missingReports={dayData.missingReports} isFuture={dayData.isFuture} />
                        </Grid>
                    ))}
                </Grid>
            </CustomTabPanel>
        </Box>
    );
};

export default DashboardPage;
