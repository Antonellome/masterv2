import { useMemo, useState, useEffect } from 'react';
import { collection, Query, where, getDocs, query, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useCollectionData } from '@/hooks/useCollectionData';
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

// Interfaccia flessibile per i dati da Firestore.
interface RapportinoFromDB extends Omit<Rapportino, 'data'> {
    data: Timestamp;
}

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

// ========= COMPONENTE PRINCIPALE =========
const AnalisiOre = () => {
    // --- Stati ---
    const [rapportiniFiltrati, setRapportiniFiltrati] = useState<RapportinoFromDB[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userInteracted, setUserInteracted] = useState(false);

    // --- Caricamento Dati Anagrafici ---
    const { data: tecnici, loading: lTecnici } = useCollectionData<Tecnico>(useMemo(() => collection(db, 'tecnici'), []));
    const { data: categorie, loading: lCategorie } = useCollectionData<Categoria>(useMemo(() => collection(db, 'categorie'), []));
    const { data: tipiGiornata, loading: lTipiGiornata } = useCollectionData<TipoGiornata>(useMemo(() => collection(db, 'tipiGiornata'), []));
    const { data: navi, loading: lNavi } = useCollectionData<Nave>(useMemo(() => collection(db, 'navi'), []));
    const { data: luoghi, loading: lLuoghi } = useCollectionData<Luogo>(useMemo(() => collection(db, 'luoghi'), []));
    const { data: clienti, loading: lClienti } = useCollectionData<Cliente>(useMemo(() => collection(db, 'clienti'), []));
    
    const dataLoading = lTecnici || lCategorie || lTipiGiornata || lNavi || lLuoghi || lClienti;

    // --- Filtri ---
    const [filtri, setFiltri] = useState({
        dataDa: '', dataA: '', categoriaId: 'all', clienteId: 'all', naveId: 'all', luogoId: 'all'
    });

    // --- Esecuzione Query ---
    useEffect(() => {
        const fetchRapportini = async () => {
            if (!userInteracted || dataLoading) return;
            if (!filtri.dataDa || !filtri.dataA) {
                setRapportiniFiltrati([]);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            try {
                // La query ora filtra solo per documenti che hanno il campo data, essendo un requisito del where.
                const startDate = new Date(filtri.dataDa);
                const endDate = new Date(filtri.dataA);

                let q: Query = query(collection(db, 'rapportini'), 
                    where('data', '>=', startDate),
                    where('data', '<=', endDate)
                );
                
                const querySnapshot = await getDocs(q);
                // Aggiungiamo un filtro per assicurarci che il campo data esista e sia valido
                const rapportiniData = querySnapshot.docs
                    .map(doc => ({ ...doc.data(), id: doc.id }))
                    .filter(r => r.data && typeof r.data.toDate === 'function') as RapportinoFromDB[];

                // Filtri client-side
                let filteredData = rapportiniData;
                if (filtri.categoriaId !== 'all' && tecnici) {
                    const tecniciConCategoria = tecnici.filter(t => t.categoriaId === filtri.categoriaId).map(t => t.id);
                    filteredData = filteredData.filter(r => r.tecnicoId && tecniciConCategoria.includes(r.tecnicoId));
                }
                if (filtri.clienteId !== 'all' && navi) {
                    const naviDelCliente = navi.filter(n => n.clienteId === filtri.clienteId).map(n => n.id);
                    filteredData = filteredData.filter(r => r.naveId && naviDelCliente.includes(r.naveId));
                }
                if (filtri.naveId !== 'all') {
                    filteredData = filteredData.filter(r => r.naveId === filtri.naveId);
                }
                if (filtri.luogoId !== 'all') {
                    filteredData = filteredData.filter(r => r.luogoId === filtri.luogoId);
                }

                setRapportiniFiltrati(filteredData);

            } catch (err) {
                console.error("Errore nel fetch dei rapportini:", err);
                setError("Si è verificato un errore durante il caricamento dei dati. Controlla la console per i dettagli.");
            }
            setIsLoading(false);
        };

        fetchRapportini();
    }, [filtri, dataLoading, tecnici, navi, userInteracted]);

    // --- Logica di Calcolo Resiliente ---
    const analisi = useMemo((): AnalisiData | null => {
        if (!rapportiniFiltrati.length || dataLoading) return null;

        const categorieMap = new Map(categorie?.map(c => [c.id, c.nome]));
        const tipiGiornataMap = new Map(tipiGiornata?.map(tg => [tg.id, tg]));
        const tecniciMap = new Map(tecnici?.map(t => [t.id, t]));

        const costoPerCategoria: { [id: string]: number } = {};
        const tecniciUnici = new Set<string>();
        let oreTotali = 0;
        let costoTotale = 0;
        let hasMissingCostData = false;

        for (const r of rapportiniFiltrati) {
            // --- BLOCCO DI VALIDAZIONE ROBUSTO ---
            if (!r.tecnicoId || !tecniciMap.has(r.tecnicoId)) {
                console.warn(`Rapportino ID ${r.id} saltato: tecnico mancante o non valido.`);
                continue;
            }
            const tecnico = tecniciMap.get(r.tecnicoId)!;

            if (!r.tipoGiornataId || !tipiGiornataMap.has(r.tipoGiornataId)) {
                console.warn(`Rapportino ID ${r.id} saltato: tipoGiornata mancante o non valido.`);
                hasMissingCostData = true;
                continue;
            }
            const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId)!;

            // --- CALCOLO SEMPLIFICATO E SICURO ---
            // Utilizziamo il campo `oreLavoro` come unica fonte di verità, evitando ricalcoli rischiosi.
            const ore = r.oreLavoro ?? 0;

            let costo = 0;
            if (typeof tipoGiornata.costoOrario === 'number') {
                costo = ore * tipoGiornata.costoOrario;
            } else {
                if (ore > 0) {
                     console.warn(`Costo non calcolato per rapportino ID ${r.id}: costo orario non definito per il tipo giornata '${tipoGiornata.nome}'.`);
                     hasMissingCostData = true;
                }
            }

            if(tecnico.categoriaId) {
                costoPerCategoria[tecnico.categoriaId] = (costoPerCategoria[tecnico.categoriaId] || 0) + costo;
            }

            oreTotali += ore;
            costoTotale += costo;
            tecniciUnici.add(r.tecnicoId);
            // Aggiungiamo anche gli altri tecnici se presenti
            r.presenze?.forEach(id => tecniciUnici.add(id));
        }

        return {
            costoPerCategoria: Object.entries(costoPerCategoria).map(([id, costo]) => ({ nome: categorieMap.get(id) || 'Sconosciuta', costo })),
            totali: { ore: oreTotali, costo: costoTotale, tecnici: tecniciUnici.size },
            hasMissingCostData
        };
    }, [rapportiniFiltrati, categorie, tipiGiornata, tecnici, dataLoading]);

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
            
            {/* Sezione Filtri */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={2}><TextField name="dataDa" label="Da (Data)" type="date" value={filtri.dataDa} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid item xs={12} sm={6} md={2}><TextField name="dataA" label="A (Data)" type="date" value={filtri.dataA} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid item xs={12} sm={6} md={2}><FormControl fullWidth><InputLabel>Categoria</InputLabel><Select name="categoriaId" value={filtri.categoriaId} label="Categoria" onChange={handleFilterChange}>{categorie?.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}<MenuItem value="all">Tutte</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} sm={6} md={2}><FormControl fullWidth><InputLabel>Cliente</InputLabel><Select name="clienteId" value={filtri.clienteId} label="Cliente" onChange={handleFilterChange}>{clienti?.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}<MenuItem value="all">Tutti</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} sm={6} md={2}><FormControl fullWidth><InputLabel>Nave</InputLabel><Select name="naveId" value={filtri.naveId} label="Nave" onChange={handleFilterChange}>{navi?.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}<MenuItem value="all">Tutte</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} sm={6} md={2}><FormControl fullWidth><InputLabel>Luogo</InputLabel><Select name="luogoId" value={filtri.luogoId} label="Luogo" onChange={handleFilterChange}>{luoghi?.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}<MenuItem value="all">Tutti</MenuItem></Select></FormControl></Grid>
            </Grid>
            
            {/* Sezione Risultati */}
            {isLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box> : 
             error ? <Alert severity="error">{error}</Alert> : 
             !userInteracted || (!filtri.dataDa || !filtri.dataA) ? <Alert severity="info">Imposta un intervallo di date per avviare l'analisi.</Alert> :
             !rapportiniFiltrati.length ? <Alert severity="warning">Nessun rapportino trovato per i filtri selezionati.</Alert> :
             analisi && (
                <>
                    {analisi.hasMissingCostData && 
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Attenzione: per alcuni rapportini non è stato possibile calcolare il costo perché i dati erano incompleti (es. tipo giornata o costo orario mancante). Il costo totale potrebbe essere inferiore al reale. Controlla la console per i dettagli.
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
