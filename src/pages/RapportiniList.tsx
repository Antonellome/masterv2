
import React, { useState, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useNavigate } from 'react-router-dom';
import {
    Paper, Typography, Button, CircularProgress, Box,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Grid, TextField, Autocomplete, IconButton, Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import { useData } from '@/hooks/useData';
import { Rapportino } from '@/models/definitions';

dayjs.locale('it');

interface RapportinoDocument extends Omit<Rapportino, 'data'> {
    id: string;
    data: { toDate: () => Date };
}

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnicoId: string | null;
    naveId: string | null;
    luogoId: string | null;
    clienteId: string | null;
    tipoGiornataId: string | null;
}

const RapportiniList = () => {
    const [rapportini, setRapportini] = useState<RapportinoDocument[]>([]);
    const [loadingRapportini, setLoadingRapportini] = useState(true);
    const navigate = useNavigate();
    
    const { tecnici, clienti, navi, luoghi, tipiGiornata, loading: loadingAnagrafiche, error } = useData();

    const [filters, setFilters] = useState<FilterState>({
        dataDa: null, dataA: null, tecnicoId: null, naveId: null, luogoId: null, clienteId: null, tipoGiornataId: null
    });

    const fetchRapportini = useCallback(async () => {
        setLoadingRapportini(true);
        try {
            const rapportiniSnapshot = await getDocs(collection(db, 'rapportini'));
            const rapportiniList = rapportiniSnapshot.docs.map(doc => 
                ({ id: doc.id, ...doc.data() } as RapportinoDocument));
            setRapportini(rapportiniList);
        } catch (err) {
            console.error("Errore durante il fetch dei rapportini:", err);
        }
        setLoadingRapportini(false);
    }, []);

    React.useEffect(() => {
        fetchRapportini();
    }, [fetchRapportini]);
    
    const handleFilterChange = <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const resetFilters = () => {
        setFilters({ dataDa: null, dataA: null, tecnicoId: null, naveId: null, luogoId: null, clienteId: null, tipoGiornataId: null });
    };

    const anagraficheMap = useMemo(() => ({
        tecnici: new Map(tecnici.map(t => [t.id, t])),
        clienti: new Map(clienti.map(c => [c.id, c])),
        navi: new Map(navi.map(n => [n.id, n])),
        luoghi: new Map(luoghi.map(l => [l.id, l])),
        tipiGiornata: new Map(tipiGiornata.map(tg => [tg.id, tg]))
    }), [tecnici, clienti, navi, luoghi, tipiGiornata]);

    const filteredRapportini = useMemo(() => {
        if (loadingAnagrafiche) return [];

        return rapportini.filter(r => {
            const rapportinoDate = dayjs(r.data.toDate());
            if (filters.dataDa && rapportinoDate.isBefore(filters.dataDa, 'day')) return false;
            if (filters.dataA && rapportinoDate.isAfter(filters.dataA, 'day')) return false;
            if (filters.tecnicoId && !(r.presenze || [r.tecnicoId]).includes(filters.tecnicoId)) return false;
            if (filters.naveId && r.naveId !== filters.naveId) return false;
            if (filters.luogoId && r.luogoId !== filters.luogoId) return false;
            if (filters.clienteId && r.clienteId !== filters.clienteId) return false;
            if (filters.tipoGiornataId && r.tipoGiornataId !== filters.tipoGiornataId) return false;
            return true;
        });
    }, [rapportini, filters, loadingAnagrafiche]);

    const handlePrint = (rapportino: RapportinoDocument) => {
        const tecniciInclusi = (rapportino.dettaglioOreTecnici || []).map(d => {
            const tecnico = anagraficheMap.tecnici.get(d.tecnicoId);
            return { ...d, nome: tecnico ? `${tecnico.cognome} ${tecnico.nome}`.trim() : 'Tecnico non trovato' };
        });

        const populatedRapportino = {
            ...rapportino,
            data: rapportino.data.toDate(),
            tecnico: anagraficheMap.tecnici.get(rapportino.tecnicoId || ''),
            cliente: anagraficheMap.clienti.get(rapportino.clienteId || ''),
            nave: anagraficheMap.navi.get(rapportino.naveId || ''),
            luogo: anagraficheMap.luoghi.get(rapportino.luogoId || ''),
            tipoGiornata: anagraficheMap.tipiGiornata.get(rapportino.tipoGiornataId || ''),
            dettaglioOreTecnici: tecniciInclusi
        };
        navigate('/rapportino/print', { state: { rapportino: populatedRapportino } });
    };

    if (loadingAnagrafiche || loadingRapportini) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }
    
    if (error) {
        return <Typography color="error" sx={{textAlign: 'center', p: 4}}>{error}</Typography>
    }

    return (
      <Box sx={{ p: { xs: 2, md: 3} }}>
         <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4">Reportistica Rapportini</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/rapportino/edit/new')}>Crea Nuovo</Button>
        </Box>

        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Filtri Ricerca</Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} /></Grid>
                <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={tecnici} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={tecnici.find(t => t.id === filters.tecnicoId) || null} onChange={(_, v) => handleFilterChange('tecnicoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tecnico" />} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={clienti} getOptionLabel={o => o.nome || ''} value={clienti.find(c => c.id === filters.clienteId) || null} onChange={(_, v) => handleFilterChange('clienteId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Cliente" />} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={navi} getOptionLabel={o => o.nome || ''} value={navi.find(n => n.id === filters.naveId) || null} onChange={(_, v) => handleFilterChange('naveId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Nave" />} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={luoghi} getOptionLabel={o => o.nome || ''} value={luoghi.find(l => l.id === filters.luogoId) || null} onChange={(_, v) => handleFilterChange('luogoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Luogo" />} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Autocomplete options={tipiGiornata} getOptionLabel={o => o.nome || ''} value={tipiGiornata.find(tg => tg.id === filters.tipoGiornataId) || null} onChange={(_, v) => handleFilterChange('tipoGiornataId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" />} /></Grid>
                <Grid item container justifyContent="flex-end" xs={12} md={9}><Button onClick={resetFilters} variant="outlined">Azzera</Button></Grid>
            </Grid>
        </Paper>

        <TableContainer component={Paper}>
          <Table stickyHeader size="small">
            <TableHead><TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Tecnici</TableCell>
                <TableCell>Tipo Giornata</TableCell>
                <TableCell>Nave</TableCell>
                <TableCell>Luogo</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Ore Resp.</TableCell>
                <TableCell>Ore Totali</TableCell>
                <TableCell align='right'>Azioni</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {filteredRapportini.map(r => {
                const tipoGiornataNome = anagraficheMap.tipiGiornata.get(r.tipoGiornataId || '')?.nome || 'N/D';
                const clienteNome = r.clienteId ? anagraficheMap.clienti.get(r.clienteId)?.nome || 'N/D' : 'N/D';
                const naveNome = r.naveId ? anagraficheMap.navi.get(r.naveId)?.nome || 'N/D' : 'N/D';
                const luogoNome = r.luogoId ? anagraficheMap.luoghi.get(r.luogoId)?.nome || 'N/D' : 'N/D';

                // --- LOGICA DI CALCOLO DEFINITIVA E ROBUSTA ---
                const oreResponsabile = parseFloat(r.dettaglioOreTecnici?.find(d => d.tecnicoId === r.tecnicoId)?.ore?.toString() || '0');
                const oreTotali = (r.dettaglioOreTecnici || []).reduce((acc, curr) => acc + (parseFloat(curr.ore?.toString() || '0')), 0);

                return (
                  <TableRow key={r.id} hover>
                    <TableCell>{dayjs(r.data.toDate()).format('DD/MM/YY')}</TableCell>
                    <TableCell>
                        {(r.presenze || [r.tecnicoId]).map(id => {
                             if (!id) return null;
                             const tecnico = anagraficheMap.tecnici.get(id);
                             return <Chip key={id} label={tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'ID non trovato'} size="small" sx={{mr: 0.5, mb: 0.5}}/>;
                        })}
                    </TableCell>
                    <TableCell>{tipoGiornataNome}</TableCell>
                    <TableCell>{naveNome}</TableCell>
                    <TableCell>{luogoNome}</TableCell>
                    <TableCell>{clienteNome}</TableCell>
                    <TableCell>{oreResponsabile.toFixed(1)}h</TableCell>
                    <TableCell>{oreTotali.toFixed(1)}h</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => navigate(`/rapportino/edit/${r.id}`)}><EditIcon /></IconButton>
                      <IconButton size="small" onClick={() => handlePrint(r)}><PrintIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRapportini.length === 0 && (
                  <TableRow><TableCell colSpan={9} align="center">Nessun rapportino corrisponde ai filtri selezionati.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
  );
};

export default RapportiniList;
