import React, { useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, Grid, Tabs, Tab, List, ListItem, ListItemText, ListItemAvatar, Avatar, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import { useFirestoreData } from '@/hooks/useFirestoreData';
import { collection, Query } from 'firebase/firestore'; // Import Query type
import { db } from '../firebase';
import type { Rapportino, Tecnico, TipoGiornata, Nave, Luogo } from '../models/definitions'; 
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import isBetween from 'dayjs/plugin/isBetween';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WorkIcon from '@mui/icons-material/Work';

dayjs.extend(isBetween);
dayjs.locale('it');

// ========= COMPONENTI CALENDARIO =========
interface CalendarDayCardProps {
    day: number;
    missingReports: number;
    isFuture: boolean;
}

const CalendarDayCard: React.FC<CalendarDayCardProps> = ({ day, missingReports, isFuture }) => {
    let cardColor = 'transparent';
    let textColor = 'text.primary';

    if (isFuture) {
        cardColor = 'grey.600';
        textColor = 'white';
    } else {
        cardColor = missingReports > 0 ? 'error.light' : 'success.light';
        textColor = missingReports > 0 ? 'error.contrastText' : 'inherit';
    }

    return (
        <Card sx={{ height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: cardColor, border: isFuture ? '1px solid' : 'none', borderColor: 'grey.700' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" sx={{ color: textColor }}>{day}</Typography>
                {!isFuture && (
                    <>
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography variant="h4" align="center" sx={{ color: textColor, fontWeight: 'bold' }}>
                            {missingReports}
                        </Typography>
                        <Typography variant="caption" align="center" display="block" sx={{ color: textColor, fontSize: '0.7rem' }}>
                            mancanti
                        </Typography>
                    </>
                )}
            </CardContent>
        </Card>
    );
};


// ========= WIDGET E COMPONENTI INTERNI =========
interface StatCardProps {
    title: string;
    value: string | number;
    color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Typography color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h4" component="div" sx={{ color: color || 'primary.main' }}>
                {value}
            </Typography>
        </CardContent>
    </Card>
);

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

// ========= COMPONENTE PRINCIPALE DELLA DASHBOARD =========
const DashboardPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
    const [selectedYear, setSelectedYear] = useState(dayjs().year());

    // CORREZIONE DEFINITIVA: Memoizzazione delle query per prevenire re-render infiniti
    const rapportiniQuery = useMemo(() => collection(db, 'rapportini') as Query<Rapportino>, []);
    const tecniciQuery = useMemo(() => collection(db, 'tecnici') as Query<Tecnico>, []);
    const tipiGiornataQuery = useMemo(() => collection(db, 'tipiGiornata') as Query<TipoGiornata>, []);
    const naviQuery = useMemo(() => collection(db, 'navi') as Query<Nave>, []);
    const luoghiQuery = useMemo(() => collection(db, 'luoghi') as Query<Luogo>, []);

    const { data: rapportini, loading: lRapportini } = useFirestoreData<Rapportino>(rapportiniQuery);
    const { data: tecnici, loading: lTecnici } = useFirestoreData<Tecnico>(tecniciQuery);
    const { data: tipiGiornata, loading: lTipiGiornata } = useFirestoreData<TipoGiornata>(tipiGiornataQuery);
    const { data: navi, loading: lNavi } = useFirestoreData<Nave>(naviQuery);
    const { data: luoghi, loading: lLuoghi } = useFirestoreData<Luogo>(luoghiQuery);

    const isLoading = lRapportini || lTecnici || lTipiGiornata || lNavi || lLuoghi;

    const memoizedData = useMemo(() => {
        if (isLoading || !rapportini || !tecnici || !tipiGiornata || !navi || !luoghi) return null;
        
        const today = dayjs();

        const thirtyDaysAgo = today.subtract(30, 'day');
        const sevenDaysAgo = today.subtract(7, 'day');
        const tipiGiornataMap = new Map(tipiGiornata.map(tg => [tg.id, tg]));
        const tecniciMap = new Map(tecnici.map(t => [t.id, `${t.nome} ${t.cognome}`]));
        const naviMap = new Map(navi.map(n => [n.id, n.nome]));
        const luoghiMap = new Map(luoghi.map(l => [l.id, l.nome]));
        const rapportiniWithDate = rapportini.map(r => ({...r, date: dayjs((r.data as any).toDate())}));

        const rapportiniUltimi30Giorni = rapportiniWithDate.filter(r => r.date.isAfter(thirtyDaysAgo));
        let oreTotali30 = 0;
        let costoTotale30 = 0;
        rapportiniUltimi30Giorni.forEach(r => {
            const ore = r.oreLavorate || 0;
            const costoOra = tipiGiornataMap.get(r.giornataId)?.costoOrario || 0;
            oreTotali30 += ore;
            costoTotale30 += ore * costoOra;
        });

        const activityLast7Days = Array.from({ length: 7 }, (_, i) => {
            const date = today.subtract(6 - i, 'day');
            return { date: date.format('DD/MM'), ore: 0 };
        });
        rapportiniWithDate.filter(r => r.date.isAfter(sevenDaysAgo)).forEach(r => {
            const dateStr = r.date.format('DD/MM');
            const dayData = activityLast7Days.find(d => d.date === dateStr);
            if (dayData) dayData.ore += r.oreLavorate || 0;
        });
        
        const attivitaRecenti = [...rapportiniWithDate]
            .sort((a, b) => b.date.valueOf() - a.date.valueOf()).slice(0, 5)
            .map(r => ({ id: r.id, tecnico: tecniciMap.get(r.tecnicoId) || 'N/A', data: r.date.format('DD/MM/YYYY'), destinazione: r.naveId ? naviMap.get(r.naveId) : (r.luogoId ? luoghiMap.get(r.luogoId) : 'Nessuna'), descrizione: r.breveDescrizione }));
        
        const presenzeOggi = new Set<string>();
        rapportiniWithDate.filter(r => r.date.isSame(today, 'day')).forEach(r => {
             const nomeTecnico = tecniciMap.get(r.tecnicoId);
            if (nomeTecnico) presenzeOggi.add(nomeTecnico);
        });

        const activeTechnicians = tecnici.filter(t => t.attivo).length;
        const daysInMonth = dayjs().year(selectedYear).month(selectedMonth).daysInMonth();
        const firstDayOfMonth = dayjs().year(selectedYear).month(selectedMonth).startOf('month').day();

        const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const currentDate = dayjs().year(selectedYear).month(selectedMonth).date(day);
            const isFuture = currentDate.isAfter(today, 'day');

            let missingReports = 0;
            if (!isFuture) {
                const rapportiniDelGiorno = rapportiniWithDate.filter(r => r.date.isSame(currentDate, 'day'));
                const uniqueTechnicians = new Set(rapportiniDelGiorno.map(r => r.tecnicoId));
                missingReports = activeTechnicians - uniqueTechnicians.size;
            }
            
            return { day, missingReports: Math.max(0, missingReports), isFuture };
        });

        return {
            oreTotali30: oreTotali30.toFixed(1),
            costoTotale30: `€ ${costoTotale30.toFixed(2)}`,
            rapportiniCreati30: rapportiniUltimi30Giorni.length,
            activityLast7Days,
            attivitaRecenti,
            presenzeOggi: Array.from(presenzeOggi),
            calendarData: { days: calendarDays, offset: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) },
        };

    }, [isLoading, rapportini, tecnici, tipiGiornata, navi, luoghi, selectedMonth, selectedYear]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setTabValue(newValue);
    const handleMonthChange = (event: SelectChangeEvent<number>) => setSelectedMonth(event.target.value as number);
    const handleYearChange = (event: SelectChangeEvent<number>) => setSelectedYear(event.target.value as number);

    if (isLoading) {
        return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    }

    if (!memoizedData) {
        return <Box sx={{ p: 3 }}><Alert severity="info">Nessun dato disponibile per generare la dashboard.</Alert></Box>;
    }

    const { oreTotali30, costoTotale30, rapportiniCreati30, activityLast7Days, attivitaRecenti, presenzeOggi, calendarData } = memoizedData;

    return (
        <Box sx={{ width: '100%', p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
                    <Tab label="Riepilogo" />
                    <Tab label="Attività Recenti" />
                    <Tab label="Presenze di Oggi" />
                    <Tab label="Monitoraggio Sincronizzazioni" />
                </Tabs>
            </Box>
            <CustomTabPanel value={tabValue} index={0}>
                 <Grid container spacing={3}>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 4
                        }}><StatCard title="Ore Lavorate (30gg)" value={oreTotali30} /></Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 4
                        }}><StatCard title="Costo Personale (30gg)" value={costoTotale30} /></Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 4
                        }}><StatCard title="Rapportini Creati (30gg)" value={rapportiniCreati30} /></Grid>
                    <Grid size={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Attività ultima settimana (ore)</Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={activityLast7Days} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
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
                            <ListItem key={item.id}><ListItemAvatar><Avatar><WorkIcon /></Avatar></ListItemAvatar><ListItemText primary={`${item.tecnico} - ${item.destinazione}`} secondary={`${item.data} - ${item.descrizione || 'Nessuna descrizione'}`}/></ListItem>
                        )) : <Typography sx={{p: 2}}>Nessuna attività recente.</Typography>}
                    </List>
                </CardContent></Card>
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={2}>
                <Card><CardContent>
                    <Typography variant="h6" gutterBottom>Tecnici con attività registrata oggi</Typography>
                    <List>
                        {presenzeOggi.length > 0 ? presenzeOggi.map((nome, index) => (
                            <ListItem key={index}><ListItemText primary={nome} /></ListItem>
                        )) : <Typography sx={{p: 2}}>Nessuna presenza registrata per oggi.</Typography>}
                    </List>
                </CardContent></Card>
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={3}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <FormControl>
                        <InputLabel>Mese</InputLabel>
                        <Select value={selectedMonth} label="Mese" onChange={handleMonthChange}>
                            {Array.from({length: 12}, (_, i) => <MenuItem key={i} value={i}>{dayjs().month(i).format('MMMM')}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <InputLabel>Anno</InputLabel>
                        <Select value={selectedYear} label="Anno" onChange={handleYearChange}>
                            {Array.from({length: 5}, (_, i) => dayjs().year() - i).map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <Grid container spacing={1}>
                    {Array.from({ length: calendarData.offset }).map((_, index) => <Grid key={`offset-${index}`} size={12/7} />)}
                    {calendarData.days.map((dayData) => (
                        <Grid key={dayData.day} size={12/7}>
                           <CalendarDayCard day={dayData.day} missingReports={dayData.missingReports} isFuture={dayData.isFuture} />
                        </Grid>
                    ))}
                </Grid>
            </CustomTabPanel>
        </Box>
    );
};

export default DashboardPage;
