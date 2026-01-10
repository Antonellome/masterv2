import { useMemo, useState } from 'react';
import { collection, Query } from 'firebase/firestore';
import { db } from '@/firebase';
import { useFirestoreData } from '@/hooks/useFirestoreData';
import {
    Box, Typography, CircularProgress, Alert, Card, CardContent, Grid,
    FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell
} from 'recharts';
import type {
    Rapportino, Tecnico, Categoria, Cliente, TipoGiornata, Nave, Luogo
} from '@/models/definitions';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// ========= TIPI E INTERFACCE =========
interface AnalisiData {
    costoPerCategoria: { nome: string; costo: number }[];
    orePerDestinazione: { nome: string; ore: number }[];
    totali: {
        ore: number;
        costo: number;
        tecnici: number;
    };
}

// ========= COMPONENTE PRINCIPALE =========
const AnalisiOre = () => {
    // --- 1. Memoizzazione delle Query ---
    const rapportiniQuery = useMemo(() => collection(db, 'rapportini') as Query<Rapportino>, []);
    const tecniciQuery = useMemo(() => collection(db, 'tecnici') as Query<Tecnico>, []);
    const categorieQuery = useMemo(() => collection(db, 'categorie') as Query<Categoria>, []);
    const tipiGiornataQuery = useMemo(() => collection(db, 'tipiGiornata') as Query<TipoGiornata>, []);
    const naviQuery = useMemo(() => collection(db, 'navi') as Query<Nave>, []);
    const luoghiQuery = useMemo(() => collection(db, 'luoghi') as Query<Luogo>, []);
    const clientiQuery = useMemo(() => collection(db, 'clienti') as Query<Cliente>, []);

    // --- 2. Caricamento Dati ---
    const { data: rapportini, loading: lRapportini } = useFirestoreData<Rapportino>(rapportiniQuery);
    const { data: tecnici, loading: lTecnici } = useFirestoreData<Tecnico>(tecniciQuery);
    const { data: categorie, loading: lCategorie } = useFirestoreData<Categoria>(categorieQuery);
    const { data: tipiGiornata, loading: lTipiGiornata } = useFirestoreData<TipoGiornata>(tipiGiornataQuery);
    const { data: navi, loading: lNavi } = useFirestoreData<Nave>(naviQuery);
    const { data: luoghi, loading: lLuoghi } = useFirestoreData<Luogo>(luoghiQuery);
    const { data: clienti, loading: lClienti } = useFirestoreData<Cliente>(clientiQuery);

    const isLoading = lRapportini || lTecnici || lCategorie || lTipiGiornata || lNavi || lLuoghi || lClienti;

    // --- 3. Gestione Filtri ---
    const [filtri, setFiltri] = useState({
        dataDa: '', dataA: '', categoriaId: 'all', clienteId: 'all', naveId: 'all', luogoId: 'all'
    });

    // --- 4. Logica di Calcolo DEFINITIVA ---
    const analisi = useMemo((): AnalisiData | null => {
        if (isLoading || !rapportini) return null;

        // Creazione delle Mappe per una ricerca efficiente
        const tecniciMap = new Map(tecnici?.map(t => [t.id, t]));
        const categorieMap = new Map(categorie?.map(c => [c.id, c.nome]));
        const tipiGiornataMap = new Map(tipiGiornata?.map(tg => [tg.id, tg]));
        const naviMap = new Map(navi?.map(n => [n.id, n]));
        const luoghiMap = new Map(luoghi?.map(l => [l.id, l.nome]));

        const dataDaFiltro = filtri.dataDa ? dayjs(filtri.dataDa) : null;
        const dataAFiltro = filtri.dataA ? dayjs(filtri.dataA) : null;

        // Logica di filtraggio RATIONALIZZATA
        const rapportiniFiltrati = rapportini.filter(r => {
            const dataRapportino = dayjs(r.data.toDate());
            const tecnico = tecniciMap.get(r.tecnicoScriventeId);
            const nave = r.naveId ? naviMap.get(r.naveId) : null;

            const dataDaOk = !dataDaFiltro || dataRapportino.isSameOrAfter(dataDaFiltro, 'day');
            const dataAOk = !dataAFiltro || dataRapportino.isSameOrBefore(dataAFiltro, 'day');
            const categoriaOk = filtri.categoriaId === 'all' || (tecnico && tecnico.categoriaId === filtri.categoriaId);
            const clienteOk = filtri.clienteId === 'all' || (nave && nave.clienteId === filtri.clienteId);
            const naveOk = filtri.naveId === 'all' || r.naveId === filtri.naveId;
            const luogoOk = filtri.luogoId === 'all' || r.luogoId === filtri.luogoId;
            
            return dataDaOk && dataAOk && categoriaOk && clienteOk && naveOk && luogoOk;
        });

        const costoPerCategoria: { [id: string]: number } = {};
        const orePerDestinazione: { [id: string]: number } = {};
        const tecniciUnici = new Set<string>();
        let oreTotali = 0;
        let costoTotale = 0;

        for (const r of rapportiniFiltrati) {
            const tecnico = tecniciMap.get(r.tecnicoScriventeId);
            const tipoGiornata = tipiGiornataMap.get(r.giornataId);
            const ore = r.oreLavorate || 0;

            // --- CALCOLO COSTO CORRETTO ---
            const costo = ore * (tipoGiornata?.costoOrario || 0);
            
            if(tecnico?.categoriaId) {
                const categoriaId = tecnico.categoriaId;
                costoPerCategoria[categoriaId] = (costoPerCategoria[categoriaId] || 0) + costo;
            }

            let destinazioneId = 'Nessuna';
            if (r.naveId) {
                destinazioneId = `nave_${r.naveId}`;
            } else if (r.luogoId) {
                destinazioneId = `luogo_${r.luogoId}`;
            }
            orePerDestinazione[destinazioneId] = (orePerDestinazione[destinazioneId] || 0) + ore;

            oreTotali += ore;
            costoTotale += costo;
            if(r.tecnicoScriventeId) tecniciUnici.add(r.tecnicoScriventeId);
        }

        return {
            costoPerCategoria: Object.entries(costoPerCategoria).map(([id, costo]) => ({ nome: categorieMap.get(id) || 'Sconosciuta', costo })),
            orePerDestinazione: Object.entries(orePerDestinazione).map(([id, ore]) => {
                const [type, realId] = id.split('_');
                let nome = 'Destinazione non specificata';
                if (type === 'nave') nome = naviMap.get(realId)?.nome || `Nave ID: ${realId}`;
                else if (type === 'luogo') nome = luoghiMap.get(realId) || `Luogo ID: ${realId}`;
                return { nome, ore };
            }),
            totali: { ore: oreTotali, costo: costoTotale, tecnici: tecniciUnici.size },
        };
    }, [isLoading, rapportini, tecnici, categorie, tipiGiornata, navi, luoghi, filtri]);

    const handleFilterChange = (e: any) => {
        const { name, value } = e.target;
        setFiltri(prev => ({ ...prev, [name]: value }));
    };

    if (isLoading) {
        return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    if (!analisi) {
        return <Box sx={{ p: 3 }}><Alert severity="info">Caricamento dati in corso...</Alert></Box>;
    }
    
    if (rapportini?.length === 0) {
        return <Box sx={{ p: 3 }}><Alert severity="info">Nessun rapportino trovato nel database.</Alert></Box>;
    }

    const { totali, costoPerCategoria, orePerDestinazione } = analisi;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];
    const datiGraficiPresenti = (costoPerCategoria.length > 0 || orePerDestinazione.length > 0) && totali.ore > 0;

    return (
        <Box sx={{ p: 3, userSelect: 'none' }}>
            <Typography variant="h5" gutterBottom>Analisi Costi e Ore Lavorate</Typography>

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}><TextField name="dataDa" label="Da (Data)" type="date" value={filtri.dataDa} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField name="dataA" label="A (Data)" type="date" value={filtri.dataA} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth><InputLabel>Categoria Tecnico</InputLabel><Select name="categoriaId" value={filtri.categoriaId} label="Categoria Tecnico" onChange={handleFilterChange}><MenuItem value="all">Tutte</MenuItem>{categorie?.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}</Select></FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth><InputLabel>Cliente</InputLabel><Select name="clienteId" value={filtri.clienteId} label="Cliente" onChange={handleFilterChange}><MenuItem value="all">Tutti</MenuItem>{clienti?.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}</Select></FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth><InputLabel>Nave</InputLabel><Select name="naveId" value={filtri.naveId} label="Nave" onChange={handleFilterChange}><MenuItem value="all">Tutte</MenuItem>{navi?.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select></FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select name="luogoId" value={filtri.luogoId} label="Luogo" onChange={handleFilterChange}><MenuItem value="all">Tutti</MenuItem>{luoghi?.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select></FormControl>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                 <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6">Costo Totale</Typography><Typography variant="h4">€ {totali.costo.toFixed(2)}</Typography></CardContent></Card></Grid>
                <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6">Ore Totali Lavorate</Typography><Typography variant="h4">{totali.ore.toFixed(1)}</Typography></CardContent></Card></Grid>
                <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6">N. Tecnici Coinvolti</Typography><Typography variant="h4">{totali.tecnici}</Typography></CardContent></Card></Grid>
            </Grid>

            {datiGraficiPresenti ? (
                <Grid container spacing={4}>
                    <Grid item xs={12} lg={7}>
                        <Typography variant="h6" gutterBottom>Costi per Categoria Tecnico</Typography>
                        <Box sx={{ overflowX: 'auto' }}>
                            <BarChart width={600} height={350} data={costoPerCategoria} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="nome" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => `€ ${value.toFixed(2)}`} />
                                <Legend />
                                <Bar dataKey="costo" fill="#8884d8" name="Costo Totale" />
                            </BarChart>
                        </Box>
                    </Grid>
                    <Grid item xs={12} lg={5}>
                        <Typography variant="h6" gutterBottom>Distribuzione Ore per Destinazione</Typography>
                        <Box sx={{ overflowX: 'auto' }}>
                            <PieChart width={450} height={350}>
                                <Pie data={orePerDestinazione} dataKey="ore" nameKey="nome" cx="50%" cy="50%" outerRadius={120} fill="#82ca9d" label={(entry) => `${entry.nome} (${entry.ore.toFixed(1)}h)`}>
                                    {orePerDestinazione.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${value.toFixed(1)} ore`} />
                                <Legend />
                            </PieChart>
                        </Box>
                    </Grid>
                </Grid>
            ) : (
                <Alert severity="warning" sx={{ mt: 4 }}>Nessun dato da visualizzare nei grafici per i filtri selezionati.</Alert>
            )}
        </Box>
    );
};

export default AnalisiOre;
