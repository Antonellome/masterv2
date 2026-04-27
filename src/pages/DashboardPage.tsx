
// src/pages/DashboardPage.tsx
import React, { useMemo, useState } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Card, CardContent, Tabs, Tab,
    List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Select, MenuItem, FormControl, InputLabel, Stack, CardHeader, Divider,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useFirestoreData } from '@/hooks/useFirestoreData';
import { collection } from 'firebase/firestore';
import { db } from '../firebase';
import type { Rapportino, Tecnico, TipoGiornata, Nave, Luogo, Checkin, Cliente } from '../models/definitions';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import isBetween from 'dayjs/plugin/isBetween';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WorkIcon from '@mui/icons-material/Work';
import ShipIcon from '@mui/icons-material/DirectionsBoat';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { useCheckinData } from '@/hooks/useCheckinData';
import { useAnagrafiche } from '@/hooks/useAnagrafiche';

dayjs.extend(isBetween);
dayjs.locale('it');

const CalendarDayCard: React.FC<{ day: number; missingReports: number; isFuture: boolean; }> = ({ day, missingReports, isFuture }) => {
    const cardColor = isFuture ? 'grey.600' : (missingReports > 0 ? 'error.light' : 'success.light');
    const textColor = isFuture || missingReports > 0 ? 'white' : 'inherit';

    return (
        <Card sx={{ height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: cardColor }}>
            <CardContent sx={{ p: 1 }}>
                <Typography variant="subtitle1" sx={{ color: textColor, fontWeight: 'bold' }}>{day}</Typography>
                {!isFuture && (
                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Typography variant="h5" sx={{ color: textColor, fontWeight: 'bold' }}>
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

const StatCard: React.FC<{ title: string; value: string | number; color?: string; }> = ({ title, value, color }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Typography color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h5" component="div" sx={{ color: color || 'primary.main', fontWeight: 'bold' }}>
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

const LocationAccordion: React.FC<{ locations: { id: string; name: string; type: 'nave' | 'luogo'; technicians: Checkin[] }[], tecniciMap: Map<string, Tecnico> }> = ({ locations, tecniciMap }) => (
    <Box>
        {locations.map(({ id, name, type, technicians }) => (
            <Accordion key={id} sx={{ my: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Avatar sx={{ mr: 2, bgcolor: type === 'nave' ? 'primary.main' : 'secondary.main' }}>
                        {type === 'nave' ? <ShipIcon /> : <LocationOnIcon />}
                    </Avatar>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', flexGrow: 1, alignSelf: 'center' }}>{name}</Typography>
                    <Typography sx={{ alignSelf: 'center', color: 'text.secondary' }}>{`${technicians.length} tecnici`}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <List dense disablePadding>
                        {technicians.map(checkin => {
                            const tecnico = tecniciMap.get(checkin.tecnicoId);
                            const tecnicoName = tecnico ? `${tecnico.nome} ${tecnico.cognome}`.trim() : 'ID Tecnico non trovato';
                            return (
                                <ListItem key={checkin.id} sx={{ pl: 4}}>
                                    <ListItemText primary={tecnicoName} />
                                </ListItem>
                            );
                        })}
                    </List>
                </AccordionDetails>
            </Accordion>
        ))}
    </Box>
);


const DashboardPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
    const [selectedYear, setSelectedYear] = useState(dayjs().year());

    const todayDate = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

    const { data: rapportini, loading: lRapportini } = useFirestoreData<Rapportino>(collection(db, 'rapportini'));
    const { data: tipiGiornata, loading: lTipiGiornata } = useFirestoreData<TipoGiornata>(collection(db, 'tipiGiornata'));
    const { tecnici, navi, luoghi, loading: lAnagrafiche, error: eAnagrafiche } = useAnagrafiche();
    const { data: clienti, loading: lClienti, error: eClienti } = useFirestoreData<Cliente>(collection(db, 'clienti'));
    const { filteredCheckins, loading: lCheckins, error: eCheckins } = useCheckinData(todayDate);

    const isLoading = lRapportini || lTipiGiornata || lAnagrafiche || lCheckins || lClienti;
    const error = eAnagrafiche || eCheckins || eClienti;

    const tecniciMap = useMemo(() => new Map(tecnici?.map(t => [t.id, t]) || []), [tecnici]);
    const naviMap = useMemo(() => new Map(navi?.map(n => [n.id, {nome: n.nome, clienteId: n.clienteId}]) || []), [navi]);
    const luoghiMap = useMemo(() => new Map(luoghi?.map(l => [l.id, l.nome]) || []), [luoghi]);
    const clientiMap = useMemo(() => new Map(clienti?.map(c => [c.id, c.nome]) || []), [clienti]);

    const { checkinsByClient, luoghiCheckins } = useMemo(() => {
        if (!filteredCheckins || !navi) return { checkinsByClient: {}, luoghiCheckins: [] };

        const locations: Record<string, { id: string; name: string; type: 'nave' | 'luogo'; technicians: Checkin[], clienteId?: string }> = {};

        for (const checkin of filteredCheckins) {
            const locationId = checkin.anagraficaId;
            if (locations[locationId]) {
                locations[locationId].technicians.push(checkin);
                continue;
            }

            let name: string, type: 'nave' | 'luogo', clienteId: string | undefined;

            if (naviMap.has(locationId)) {
                const nave = naviMap.get(locationId)!;
                name = nave.nome;
                type = 'nave';
                clienteId = nave.clienteId;
            } else if (luoghiMap.has(locationId)) {
                name = luoghiMap.get(locationId)!;
                type = 'luogo';
            } else {
                name = checkin.anagraficaNome || 'Luogo Sconosciuto';
                type = 'luogo';
            }
            locations[locationId] = { id: locationId, name, type, technicians: [checkin], clienteId };
        }

        const allLocations = Object.values(locations);
        const luoghiSorted = allLocations.filter(l => l.type === 'luogo').sort((a,b) => a.name.localeCompare(b.name));
        const naviPerCliente: Record<string, { id: string; name: string; type: 'nave'; technicians: Checkin[] }[]> = {};

        allLocations.filter(l => l.type === 'nave').forEach(nave => {
            const clienteId = nave.clienteId || 'nessun-cliente';
            if (!naviPerCliente[clienteId]) naviPerCliente[clienteId] = [];
            naviPerCliente[clienteId].push(nave as any);
        });

        for (const clienteId in naviPerCliente) {
            naviPerCliente[clienteId].sort((a,b) => a.name.localeCompare(b.name));
            for (const nave of naviPerCliente[clienteId]) {
                nave.technicians.sort((a, b) => {
                    const tecnicoA = tecniciMap.get(a.tecnicoId);
                    const tecnicoB = tecniciMap.get(b.tecnicoId);
                    return (tecnicoA?.nome || '').localeCompare(tecnicoB?.nome || '');
                });
            }
        }
        
        luoghiSorted.forEach(luogo => {
            luogo.technicians.sort((a,b) => {
                const tecnicoA = tecniciMap.get(a.tecnicoId);
                const tecnicoB = tecniciMap.get(b.tecnicoId);
                return (tecnicoA?.nome || '').localeCompare(tecnicoB?.nome || '');
            })
        });

        return { checkinsByClient: naviPerCliente, luoghiCheckins: luoghiSorted };

    }, [filteredCheckins, navi, naviMap, luoghiMap, tecniciMap]);

    const memoizedStats = useMemo(() => {
        if (!rapportini || !tecnici || !tipiGiornata || !navi || !luoghi) return null;

        const today = dayjs();
        const thirtyDaysAgo = today.subtract(30, 'day');
        const sevenDaysAgo = today.subtract(7, 'day');
        const tipiGiornataMap = new Map(tipiGiornata.map(tg => [tg.id, tg]));
        const simpleTecniciMap = new Map(tecnici.map(t => [t.id, `${t.nome} ${t.cognome}`]));

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
            if (dayData) dayData.ore += r.oreLavoro || 0;
        });
        const attivitaRecenti = [...rapportiniWithDate]
            .sort((a, b) => b.date.valueOf() - a.date.valueOf()).slice(0, 5)
            .map(r => ({
                id: r.id,
                tecnico: r.presenze?.map(id => simpleTecniciMap.get(id)).filter(Boolean).join(', ') || 'N/A',
                data: r.date.format('DD/MM/YYYY'),
                destinazione: r.naveId ? naviMap.get(r.naveId)?.nome : (r.luogoId ? luoghiMap.get(r.luogoId) : 'Nessuna'),
                descrizione: r.note
            }));
        const activeTechnicians = tecnici.filter(t => t.attivo).length;
        const currentSelection = dayjs().year(selectedYear).month(selectedMonth);
        const daysInMonth = currentSelection.daysInMonth();
        const firstDayOfMonth = currentSelection.startOf('month').day();
        const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const currentDate = currentSelection.date(day);
            const isFuture = currentDate.isAfter(today, 'day');
            let missingReports = 0;
            if (!isFuture && currentDate.day() !== 0 && currentDate.day() !== 6) {
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
            calendarData: { days: calendarDays, offset: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) },
        };
    }, [rapportini, tipiGiornata, tecnici, navi, luoghi, selectedMonth, selectedYear, naviMap, luoghiMap]);
    
    if (isLoading) return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{`Errore nel caricamento dei dati: ${error.message}`}</Alert></Box>;
    if (!memoizedStats) return <Box sx={{ p: 3 }}><Alert severity="warning">Dati non sufficienti per la dashboard.</Alert></Box>;

    const { oreTotali30, costoTotale30, rapportiniCreati30, activityLast7Days, attivitaRecenti, calendarData } = memoizedStats;

    const clientKeys = Object.keys(checkinsByClient).sort((a,b) => {
      const nameA = clientiMap.get(a) || 'zzz';
      const nameB = clientiMap.get(b) || 'zzz';
      return nameA.localeCompare(nameB);
    });

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
                                <Typography variant="subtitle1" gutterBottom>Attività ultima settimana (ore)</Typography>
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
                    <Typography variant="subtitle1" gutterBottom>Ultime 5 Attività</Typography>
                    <List>
                        {attivitaRecenti.length > 0 ? attivitaRecenti.map(item => (
                            <ListItem key={item.id}><ListItemAvatar><Avatar><WorkIcon /></Avatar></ListItemAvatar><ListItemText primary={`${item.tecnico} - ${item.destinazione}`} secondary={`${item.data} - ${item.descrizione || 'Nessuna descrizione'}`} /></ListItem>
                        )) : <Typography sx={{ p: 2 }}>Nessuna attività recente.</Typography>}
                    </List>
                </CardContent></Card>
            </CustomTabPanel>

            <CustomTabPanel value={tabValue} index={2}>
                {(Object.keys(checkinsByClient).length > 0 || luoghiCheckins.length > 0) ? (
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" component="div" gutterBottom>Navi per Cliente</Typography>
                            {Object.keys(checkinsByClient).length > 0 ? (
                                clientKeys.map(clienteId => (
                                  <Box key={clienteId} sx={{ mb: 3 }}>
                                      <Typography variant="subtitle1" component="div" sx={{ mb: 1, pl: 1, fontWeight: 'bold' }}>
                                          {clientiMap.get(clienteId) || 'Nessun Cliente Associato'}
                                      </Typography>
                                      <LocationAccordion locations={checkinsByClient[clienteId]} tecniciMap={tecniciMap} />
                                  </Box>
                                ))
                            ) : (
                                <Typography sx={{ p: 2, textAlign: 'center', fontStyle: 'italic' }}>Nessun tecnico imbarcato oggi.</Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" component="div" gutterBottom>Luoghi</Typography>
                            {luoghiCheckins.length > 0 ? (
                                <LocationAccordion locations={luoghiCheckins} tecniciMap={tecniciMap} />
                            ) : (
                                <Typography sx={{ p: 2, textAlign: 'center', fontStyle: 'italic' }}>Nessun tecnico in altre sedi oggi.</Typography>
                            )}
                        </Grid>
                    </Grid>
                ) : (
                    <Typography sx={{ p: 2, textAlign: 'center', fontStyle: 'italic' }}>
                        Nessun check-in registrato per oggi.
                    </Typography>
                )}
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
                    {calendarData && Array.from({ length: calendarData.offset }).map((_, index) => <Grid item xs={12/7} key={`offset-${index}`} />)}
                    {calendarData && calendarData.days.map((dayData) => (
                        <Grid item xs={12/7} key={dayData.day}>
                            <CalendarDayCard day={dayData.day} missingReports={dayData.missingReports} isFuture={dayData.isFuture} />
                        </Grid>
                    ))}
                </Grid>
            </CustomTabPanel>
        </Box>
    );
};

export default DashboardPage;
