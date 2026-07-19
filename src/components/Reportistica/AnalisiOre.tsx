import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
    Box, Typography, CircularProgress, Alert, Card, CardContent, Grid,
    FormControl, InputLabel, Select, MenuItem, TextField, SelectChangeEvent
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import type {
    Rapportino, Tecnico, Categoria, Cliente, TipoGiornata, Nave, Luogo
} from '@/models/definitions';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

// ========= TIPI E INTERFACCE =========
interface AnalisiData {
    costoPerCategoria: { nome: string; costo: number }[];
    totali: {
        ore: number;
        costo: number;
        tecnici: number;
    };
    hasMissingCostData: boolean;
}

// ========= FUNZIONI HELPER ROBUSTE =========
const parseFloatWithComma = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const sanitizedValue = value.replace(',', '.');
        const parsed = parseFloat(sanitizedValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const normalizeDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date.toDate === 'function') return date.toDate();
    if (date.seconds) return new Date(date.seconds * 1000);
    const d = dayjs(date);
    return d.isValid() ? d.toDate() : null;
};

// ========= COMPONENTE PRINCIPALE =========
const AnalisiOre = () => {
    // --- Stati ---
    const [userInteracted, setUserInteracted] = useState(false);
    const [filtri, setFiltri] = useState({
        dataDa: '', dataA: '', categoriaId: 'all', clienteId: 'all', naveId: 'all', luogoId: 'all'
    });

    // --- CARICAMENTO DATI OFFLINE con useLiveQuery ---
    const allRapportini = useLiveQuery(() => db.rapportini.toArray(), []);
    const allTecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const allCategorie = useLiveQuery(() => db.categorie.toArray(), []);
    const allTipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);
    const allNavi = useLiveQuery(() => db.navi.toArray(), []);
    const allLuoghi = useLiveQuery(() => db.luoghi.toArray(), []);
    const allClienti = useLiveQuery(() => db.clienti.toArray(), []);

    const dataLoading = !allRapportini || !allTecnici || !allCategorie || !allTipiGiornata || !allNavi || !allLuoghi || !allClienti;

    // --- FILTRAGGIO DATI CLIENT-SIDE ---
    const rapportiniFiltrati = useMemo(() => {
        if (!allRapportini || !allTecnici || !allNavi || !filtri.dataDa || !filtri.dataA) return [];

        const startDate = dayjs(filtri.dataDa);
        const endDate = dayjs(filtri.dataA);

        return allRapportini.filter(r => {
            const dataRapportino = normalizeDate(r.data);
            if (!dataRapportino || !dayjs(dataRapportino).isBetween(startDate, endDate, 'day', '[]')) return false;

            if (filtri.categoriaId !== 'all') {
                const tecnico = allTecnici.find(t => t.id === r.tecnicoId);
                if (!tecnico || tecnico.categoriaId !== filtri.categoriaId) return false;
            }
            if (filtri.clienteId !== 'all') {
                const nave = allNavi.find(n => n.id === r.naveId);
                if (!nave || nave.clienteId !== filtri.clienteId) return false;
            }
            if (filtri.naveId !== 'all' && r.naveId !== filtri.naveId) return false;
            if (filtri.luogoId !== 'all' && r.luogoId !== filtri.luogoId) return false;

            return true;
        });
    }, [allRapportini, allTecnici, allNavi, filtri]);

    // --- Logica di Calcolo Resiliente ---
    const analisi = useMemo((): AnalisiData | null => {
        if (!rapportiniFiltrati.length || dataLoading) return null;

        const categorieMap = new Map(allCategorie?.map(c => [c.id, c.nome]));
        const tipiGiornataMap = new Map(allTipiGiornata?.map(tg => [tg.id, tg]));
        const tecniciMap = new Map(allTecnici?.map(t => [t.id, t]));

        const costoPerCategoria: { [id: string]: number } = {};
        const tecniciUnici = new Set<string>();
        let oreTotali = 0;
        let costoTotale = 0;
        let hasMissingCostData = false;

        for (const r of rapportiniFiltrati) {
            if (!r.tecnicoId || !tecniciMap.has(r.tecnicoId)) continue;
            const tecnico = tecniciMap.get(r.tecnicoId)!;

            if (!r.tipoGiornataId || !tipiGiornataMap.has(r.tipoGiornataId)) {
                hasMissingCostData = true;
                continue;
            }
            const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId)!;

            const ore = parseFloatWithComma(r.oreLavoro);

            let costo = 0;
            if (typeof tipoGiornata.costoOrario === 'number') {
                costo = ore * tipoGiornata.costoOrario;
            } else if (ore > 0) {
                hasMissingCostData = true;
            }

            if(tecnico.categoriaId) {
                costoPerCategoria[tecnico.categoriaId] = (costoPerCategoria[tecnico.categoriaId] || 0) + costo;
            }

            oreTotali += ore;
            costoTotale += costo;
            tecniciUnici.add(r.tecnicoId);
            r.presenze?.forEach(id => tecniciUnici.add(id));
        }

        return {
            costoPerCategoria: Object.entries(costoPerCategoria).map(([id, costo]) => ({ nome: categorieMap.get(id) || 'Sconosciuta', costo })),
            totali: { ore: oreTotali, costo: costoTotale, tecnici: tecniciUnici.size },
            hasMissingCostData
        };
    }, [rapportiniFiltrati, allCategorie, allTipiGiornata, allTecnici, dataLoading]);

    const handleFilterChange = (e: SelectChangeEvent<string> | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!userInteracted) setUserInteracted(true);
        const { name, value } = e.target;
        setFiltri(prev => ({ ...prev, [name]: value }));
    };

    // --- Rendering ---
    if (dataLoading) {
        return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3, userSelect: 'none' }}>
            <Typography variant="h5" gutterBottom>Analisi Costi e Ore Lavorate</Typography>
            
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={2}><TextField name="dataDa" label="Da (Data)" type="date" value={filtri.dataDa} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid item xs={12} sm={6} md={2}><TextField name="dataA" label="A (Data)" type="date" value={filtri.dataA} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid item xs={12} sm={6} md={2}><FormControl fullWidth><InputLabel>Categoria</InputLabel><Select name="categoriaId" value={filtri.categoriaId} label="Categoria" onChange={handleFilterChange}>{allCategorie?.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}<MenuItem value="all">Tutte</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} sm={6} md={2}><FormControl fullWidth><InputLabel>Cliente</InputLabel><Select name="clienteId" value={filtri.clienteId} label="Cliente" onChange={handleFilterChange}>{allClienti?.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}<MenuItem value="all">Tutti</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} sm={6} md={2}><FormControl fullWidth><InputLabel>Nave</InputLabel><Select name="naveId" value={filtri.naveId} label="Nave" onChange={handleFilterChange}>{allNavi?.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}<MenuItem value="all">Tutte</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} sm={6} md={2}><FormControl fullWidth><InputLabel>Luogo</InputLabel><Select name="luogoId" value={filtri.luogoId} label="Luogo" onChange={handleFilterChange}>{allLuoghi?.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}<MenuItem value="all">Tutti</MenuItem></Select></FormControl></Grid>
            </Grid>
            
            {!userInteracted || !filtri.dataDa || !filtri.dataA ? <Alert severity="info">Imposta un intervallo di date per avviare l'analisi.</Alert> :
             !rapportiniFiltrati.length ? <Alert severity="warning">Nessun rapportino trovato per i filtri selezionati.</Alert> :
             analisi && (
                <>
                    {analisi.hasMissingCostData && 
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Attenzione: per alcuni rapportini non è stato possibile calcolare il costo perché i dati erano incompleti (es. tipo giornata o costo orario mancante).
                        </Alert>
                    }
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6">Costo Totale</Typography><Typography variant="h4">€ {analisi.totali.costo.toFixed(2)}</Typography></CardContent></Card></Grid>
                        <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6">Ore Totali Lavorate</Typography><Typography variant="h4">{analisi.totali.ore.toFixed(1)}</Typography></CardContent></Card></Grid>
                        <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6">N. Tecnici Coinvolti</Typography><Typography variant="h4">{analisi.totali.tecnici}</Typography></CardContent></Card></Grid>
                    </Grid>

                    {analisi.costoPerCategoria.length > 0 ? (
                        <Box sx={{ height: 400 }}>
                           <Typography variant="h6" gutterBottom>Costi per Categoria Tecnico</Typography>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analisi.costoPerCategoria} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="nome" />
                                    <YAxis />
                                    <Tooltip formatter={(value: number) => `€ ${value.toFixed(2)}`} />
                                    <Legend />
                                    <Bar dataKey="costo" fill="#8884d8" name="Costo" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    ) : <Alert severity="info" sx={{ mt: 2 }}>Nessun dato da visualizzare nel grafico per i filtri selezionati.</Alert>}
                </>
            )}
        </Box>
    );
};

export default AnalisiOre;