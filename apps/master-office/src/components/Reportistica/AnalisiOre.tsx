import { useMemo, useState, useEffect } from 'react';
import { collection, Query, where, getDocs, query } from 'firebase/firestore';
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
    // --- 1. Stato per i dati filtrati ---
    const [rapportiniFiltrati, setRapportiniFiltrati] = useState<Rapportino[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- 2. Caricamento Dati Statici (per i filtri e la mappatura) ---
    const { data: tecnici, loading: lTecnici } = useFirestoreData<Tecnico>(useMemo(() => collection(db, 'tecnici'), []));
    const { data: categorie, loading: lCategorie } = useFirestoreData<Categoria>(useMemo(() => collection(db, 'categorie'), []));
    const { data: tipiGiornata, loading: lTipiGiornata } = useFirestoreData<TipoGiornata>(useMemo(() => collection(db, 'tipiGiornata'), []));
    const { data: navi, loading: lNavi } = useFirestoreData<Nave>(useMemo(() => collection(db, 'navi'), []));
    const { data: luoghi, loading: lLuoghi } = useFirestoreData<Luogo>(useMemo(() => collection(db, 'luoghi'), []));
    const { data: clienti, loading: lClienti } = useFirestoreData<Cliente>(useMemo(() => collection(db, 'clienti'), []));
    
    const dataLoading = lTecnici || lCategorie || lTipiGiornata || lNavi || lLuoghi || lClienti;

    // --- 3. Gestione Filtri ---
    const [filtri, setFiltri] = useState({
        dataDa: '', dataA: '', categoriaId: 'all', clienteId: 'all', naveId: 'all', luogoId: 'all'
    });

    // --- 4. Esecuzione della Query al cambiamento dei filtri ---
    useEffect(() => {
        const fetchRapportini = async () => {
            // Non eseguire la query se i dati di supporto non sono ancora caricati
            if (dataLoading) return;

            setIsLoading(true);
            setError(null);
            
            try {
                let q: Query = collection(db, 'rapportini');
                
                // Filtro per data
                if (filtri.dataDa) q = query(q, where('data', '>=', dayjs(filtri.dataDa).startOf('day').toDate()));
                if (filtri.dataA) q = query(q, where('data', '<=', dayjs(filtri.dataA).endOf('day').toDate()));
                
                const querySnapshot = await getDocs(q);
                let rapportiniData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Rapportino[];
                
                // Filtri che richiedono dati aggiuntivi (eseguito sul client per complessità)
                if (filtri.categoriaId !== 'all' && tecnici) {
                    const tecniciConCategoria = tecnici.filter(t => t.categoriaId === filtri.categoriaId).map(t => t.id);
                    rapportiniData = rapportiniData.filter(r => tecniciConCategoria.includes(r.tecnicoScriventeId));
                }
                if (filtri.clienteId !== 'all' && navi) {
                    const naviDelCliente = navi.filter(n => n.clienteId === filtri.clienteId).map(n => n.id);
                     rapportiniData = rapportiniData.filter(r => r.naveId && naviDelCliente.includes(r.naveId));
                }
                if (filtri.naveId !== 'all') {
                    rapportiniData = rapportiniData.filter(r => r.naveId === filtri.naveId);
                }
                if (filtri.luogoId !== 'all') {
                    rapportiniData = rapportiniData.filter(r => r.luogoId === filtri.luogoId);
                }

                setRapportiniFiltrati(rapportiniData);

            } catch (err) {
                console.error("Errore nel fetch dei rapportini:", err);
                setError("Si è verificato un errore durante il caricamento dei dati. Riprova più tardi.");
            }
            setIsLoading(false);
        };

        fetchRapportini();
    }, [filtri, dataLoading, tecnici, navi]);

    // --- 5. Logica di Calcolo Memoizzata (ora molto più leggera) ---
    const analisi = useMemo((): AnalisiData | null => {
        if (!rapportiniFiltrati || dataLoading) return null;

        const categorieMap = new Map(categorie?.map(c => [c.id, c.nome]));
        const tipiGiornataMap = new Map(tipiGiornata?.map(tg => [tg.id, tg]));
        const naviMap = new Map(navi?.map(n => [n.id, n]));
        const luoghiMap = new Map(luoghi?.map(l => [l.id, l.nome]));

        const costoPerCategoria: { [id: string]: { costo: number; tecnicoId: string } } = {};
        const orePerDestinazione: { [id: string]: number } = {};
        const tecniciUnici = new Set<string>();
        let oreTotali = 0;
        let costoTotale = 0;

        // Uso i tecnici per la mappatura categoria -> tecnico
        const tecniciMap = new Map(tecnici?.map(t => [t.id, t]));

        for (const r of rapportiniFiltrati) {
            const tecnico = tecniciMap.get(r.tecnicoScriventeId);
            const tipoGiornata = tipiGiornataMap.get(r.giornataId);
            const ore = r.oreLavorate || 0;
            const costo = ore * (tipoGiornata?.costoOrario || 0);

            if(tecnico?.categoriaId) {
                costoPerCategoria[tecnico.categoriaId] = { 
                    costo: (costoPerCategoria[tecnico.categoriaId]?.costo || 0) + costo,
                    tecnicoId: tecnico.id
                };
            }

            let destinazioneId = 'Nessuna';
            if (r.naveId) destinazioneId = `nave_${r.naveId}`;
            else if (r.luogoId) destinazioneId = `luogo_${r.luogoId}`;
            orePerDestinazione[destinazioneId] = (orePerDestinazione[destinazioneId] || 0) + ore;

            oreTotali += ore;
            costoTotale += costo;
            if(r.tecnicoScriventeId) tecniciUnici.add(r.tecnicoScriventeId);
        }

        return {
            costoPerCategoria: Object.entries(costoPerCategoria).map(([id, data]) => ({ nome: categorieMap.get(id) || 'Sconosciuta', costo: data.costo })),
            orePerDestinazione: Object.entries(orePerDestinazione).map(([id, ore]) => {
                const [type, realId] = id.split('_');
                let nome = 'Destinazione non specificata';
                if (type === 'nave') nome = naviMap.get(realId)?.nome || `Nave ID: ${realId}`;
                else if (type === 'luogo') nome = luoghiMap.get(realId) || `Luogo ID: ${realId}`;
                return { nome, ore };
            }),
            totali: { ore: oreTotali, costo: costoTotale, tecnici: tecniciUnici.size },
        };
    }, [rapportiniFiltrati, categorie, tipiGiornata, navi, luoghi, tecnici, dataLoading]);

    const handleFilterChange = (e: any) => {
        const { name, value } = e.target;
        setFiltri(prev => ({ ...prev, [name]: value }));
    };

    if (dataLoading) {
        return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];

    return (
        <Box sx={{ p: 3, userSelect: 'none' }}>
            <Typography variant="h5" gutterBottom>Analisi Costi e Ore Lavorate</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                    }}><TextField name="dataDa" label="Da (Data)" type="date" value={filtri.dataDa} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                    }}><TextField name="dataA" label="A (Data)" type="date" value={filtri.dataA} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                    }}>
                    <FormControl fullWidth><InputLabel>Categoria Tecnico</InputLabel><Select name="categoriaId" value={filtri.categoriaId} label="Categoria Tecnico" onChange={handleFilterChange}><MenuItem value="all">Tutte</MenuItem>{categorie?.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}</Select></FormControl>
                </Grid>
                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                    }}>
                    <FormControl fullWidth><InputLabel>Cliente</InputLabel><Select name="clienteId" value={filtri.clienteId} label="Cliente" onChange={handleFilterChange}><MenuItem value="all">Tutti</MenuItem>{clienti?.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}</Select></FormControl>
                </Grid>
                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                    }}>
                    <FormControl fullWidth><InputLabel>Nave</InputLabel><Select name="naveId" value={filtri.naveId} label="Nave" onChange={handleFilterChange}><MenuItem value="all">Tutte</MenuItem>{navi?.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select></FormControl>
                </Grid>
                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                    }}>
                    <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select name="luogoId" value={filtri.luogoId} label="Luogo" onChange={handleFilterChange}><MenuItem value="all">Tutti</MenuItem>{luoghi?.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select></FormControl>
                </Grid>
            </Grid>
            {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}
            {!isLoading && !error && (
                <>
                    {analisi ? (
                        <>
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid
                                    size={{
                                        xs: 12,
                                        md: 4
                                    }}><Card><CardContent><Typography variant="h6">Costo Totale</Typography><Typography variant="h4">€ {analisi.totali.costo.toFixed(2)}</Typography></CardContent></Card></Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        md: 4
                                    }}><Card><CardContent><Typography variant="h6">Ore Totali Lavorate</Typography><Typography variant="h4">{analisi.totali.ore.toFixed(1)}</Typography></CardContent></Card></Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        md: 4
                                    }}><Card><CardContent><Typography variant="h6">N. Tecnici Coinvolti</Typography><Typography variant="h4">{analisi.totali.tecnici}</Typography></CardContent></Card></Grid>
                            </Grid>

                            {(analisi.costoPerCategoria.length > 0 || analisi.orePerDestinazione.length > 0) ? (
                                <Grid container spacing={4}>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            lg: 7
                                        }}>
                                        <Typography variant="h6" gutterBottom>Costi per Categoria Tecnico</Typography>
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <BarChart width={600} height={350} data={analisi.costoPerCategoria} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="nome" />
                                                <YAxis />
                                                <Tooltip formatter={(value: number) => `€ ${value.toFixed(2)}`} />
                                                <Legend />
                                                <Bar dataKey="costo" fill="#8884d8" name="Costo Totale" />
                                            </BarChart>
                                        </Box>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            lg: 5
                                        }}>
                                        <Typography variant="h6" gutterBottom>Distribuzione Ore per Destinazione</Typography>
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <PieChart width={450} height={350}>
                                                <Pie data={analisi.orePerDestinazione} dataKey="ore" nameKey="nome" cx="50%" cy="50%" outerRadius={120} fill="#82ca9d" label={(entry) => `${entry.nome} (${entry.ore.toFixed(1)}h)`}>
                                                    {analisi.orePerDestinazione.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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
                        </>
                    ) : (
                        <Alert severity="info">Nessun dato corrisponde ai filtri selezionati.</Alert>
                    )}
                </>
            )}
        </Box>
    );
};

export default AnalisiOre;
