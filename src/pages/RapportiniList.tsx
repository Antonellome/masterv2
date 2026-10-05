import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Paper, Typography, Button, Box,
    Grid, TextField, Autocomplete, Snackbar, Alert,
    Dialog, DialogContent, DialogActions, IconButton, CircularProgress
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import AddIcon from '@mui/icons-material/Add';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Rapportino } from '@/models/definitions';
import { useRapportiniStore } from '@/store/useRapportiniStore'; // 1. IMPORTIAMO LO STORE
import RapportiniTable from '@/components/Rapportini/RapportiniTable';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import PdfPreviewDialog from '@/components/Rapportini/PdfPreviewDialog';
import RapportinoPrint from '@/components/Rapportini/RapportinoPrint'; 
import { logger } from '@/utils/logger';

dayjs.locale('it');

const handleCloudSync = async (operation: 'delete', collectionName: string, data: any) => {
    logger.log(`[Cloud Sync] ${operation} su ${collectionName}:`, data);
    return Promise.resolve();
};

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnicoId: string | null;
    naveId: string | null;
    clienteId: string | null;
}

const RapportiniListPage = () => {
    const navigate = useNavigate();

    // 2. PRENDIAMO LE AZIONI DALLO STORE
    const { setData, openRapportinoForm } = useRapportiniStore();

    // 3. CARICHIAMO TUTTI I DATI MAESTRI DA DEXIE
    const rapportini = useLiveQuery(() => db.rapportini.toArray(), []);
    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const clienti = useLiveQuery(() => db.clienti.toArray(), []);
    const navi = useLiveQuery(() => db.navi.toArray(), []);
    const luoghi = useLiveQuery(() => db.luoghi.toArray(), []);
    const veicoli = useLiveQuery(() => db.veicoli.toArray(), []);
    const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);

    // 4. INSERIAMO I DATI NELLO STORE (MODIFICA INVISIBILE)
    useEffect(() => {
        if (tecnici && navi && luoghi && veicoli && tipiGiornata) {
            logger.log('RapportiniList: Populating central store with data from Dexie.');
            // @ts-ignore
            setData({
                tecnici,
                navi,
                luoghi,
                veicoli,
                tipiGiornata,
            });
        }
    }, [tecnici, navi, luoghi, veicoli, tipiGiornata, setData]);


    const isLoadingData = !rapportini || !tecnici || !clienti || !navi || !luoghi || !veicoli || !tipiGiornata;

    const [filters, setFilters] = useState<FilterState>({
        dataDa: dayjs().subtract(3, 'month').startOf('month'), 
        dataA: dayjs().endOf('month'), 
        tecnicoId: null, naveId: null, clienteId: null,
    });

    const [deleteDialog, setDeleteDialog] = useState({ open: false, rapportinoId: '' });
    const [detailRapportino, setDetailRapportino] = useState<Rapportino | null>(null);
    const [printState, setPrintState] = useState({ isGenerating: false, pdfDataUrl: null, rapportinoToPrint: null });
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
    
    const printRef = useRef<HTMLDivElement>(null);

    const handleFilterChange = <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };
    const resetFilters = useCallback(() => setFilters({
        dataDa: dayjs().subtract(3, 'month').startOf('month'),
        dataA: dayjs().endOf('month'),
        tecnicoId: null, naveId: null, clienteId: null
    }), []);

    const filteredRapportini = useMemo(() => {
        if (!rapportini) return [];
        return rapportini.filter(r => {
            const rapportinoDate = dayjs(r.data);
            if (!rapportinoDate.isValid()) return false;
            if (filters.dataDa && rapportinoDate.isBefore(filters.dataDa, 'day')) return false;
            if (filters.dataA && rapportinoDate.isAfter(filters.dataA, 'day')) return false;
            if (filters.tecnicoId && r.tecnicoId !== filters.tecnicoId && !r.presenze?.includes(filters.tecnicoId)) return false;
            if (filters.naveId && r.naveId !== filters.naveId) return false;
            if (filters.clienteId && r.clienteId !== filters.clienteId) return false;
            return true;
        }).sort((a, b) => dayjs(b.data).valueOf() - dayjs(a.data).valueOf());
    }, [rapportini, filters]);

    const getRapportinoById = useCallback((id: string) => {
        return rapportini?.find(r => r.id === id);
    }, [rapportini]);

    const handleRowClick = (rapportino: Rapportino) => {
        setDetailRapportino(getRapportinoById(rapportino.id) || rapportino);
    };
    const handleCloseDetail = () => setDetailRapportino(null);

    const handleOpenDeleteDialog = (idToDelete: string) => setDeleteDialog({ open: true, rapportinoId: idToDelete });
    const handleCloseDeleteDialog = () => !isLoading && setDeleteDialog({ open: false, rapportinoId: '' });
    
    const handleConfirmDelete = useCallback(async () => {
        if (!deleteDialog.rapportinoId) return;
        setIsLoading(true);
        try {
            await db.rapportini.delete(deleteDialog.rapportinoId);
            await handleCloudSync('delete', 'rapportini', { id: deleteDialog.rapportinoId });
            setNotification({ open: true, message: 'Rapportino eliminato con successo!', severity: 'success' });
        } catch (error) {
            logger.error("Errore eliminazione rapportino", error);
            setNotification({ open: true, message: 'Impossibile eliminare il rapportino.', severity: 'error' });
        } finally {
            setIsLoading(false);
            handleCloseDeleteDialog();
        }
    }, [deleteDialog.rapportinoId]);

    const handlePrint = useCallback(async (rapportinoStub: Rapportino) => { /* ... logica invariata ... */ }, [getRapportinoById]);
    const handleClosePrintDialog = () => setPrintState({ isGenerating: false, pdfDataUrl: null, rapportinoToPrint: null });
    
    const handleShare = async () => {/* ... logica invariata ... */};

    if (isLoadingData) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">Elenco Rapportini</Typography>
                    {/* Il tasto nuovo rapportino ora usa l'azione dello store */}
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => openRapportinoForm(null)}>
                        Nuovo Rapportino
                    </Button>
                </Box>

                <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>Filtri Ricerca</Typography>
                     <Grid container spacing={2} alignItems="center">
                         <Grid item xs={12} md={3}><DatePicker label="Dal" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} /></Grid>
                         <Grid item xs={12} md={3}><DatePicker label="Al" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} /></Grid>
                         <Grid item xs={12} md={3}><Autocomplete options={tecnici || []} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={(tecnici || []).find(t => t.id === filters.tecnicoId) || null} onChange={(_, v) => handleFilterChange('tecnicoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tecnico" />} /></Grid>
                         <Grid item xs={12} md={3}><Autocomplete options={clienti || []} getOptionLabel={o => o.nome || ''} value={(clienti || []).find(c => c.id === filters.clienteId) || null} onChange={(_, v) => handleFilterChange('clienteId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Cliente" />} /></Grid>
                         <Grid item xs={12} md={3}><Autocomplete options={navi || []} getOptionLabel={o => o.nome || ''} value={(navi || []).find(n => n.id === filters.naveId) || null} onChange={(_, v) => handleFilterChange('naveId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Nave" />} /></Grid>
                         <Grid item xs={12} md={3}><Button onClick={resetFilters} variant="outlined" size="large">Azzera</Button></Grid>
                    </Grid>
                </Paper>

                <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                     {/* 5. USIAMO openRapportinoForm PER L'EDIT, NON PIU' LA NAVIGAZIONE */}
                    <RapportiniTable 
                        rapportini={filteredRapportini} 
                        onRowClick={handleRowClick} 
                        onEdit={openRapportinoForm} // <--- MODIFICA CHIAVE
                        onDelete={handleOpenDeleteDialog} 
                        onPrint={handlePrint} 
                    />
                </Paper>
            </Box>

            {/* Dialogs and Snackbars (logica invariata) */}
            <Dialog open={!!detailRapportino} onClose={handleCloseDetail} fullWidth maxWidth="md"><DialogContent><RapportinoPrint rapportino={detailRapportino!} /></DialogContent></Dialog>
            <PdfPreviewDialog open={!!printState.pdfDataUrl} onClose={handleClosePrintDialog} onShare={handleShare} pdfDataUrl={printState.pdfDataUrl} isGenerating={printState.isGenerating} fileName={`Rapportino-${printState.rapportinoToPrint?.id}.pdf`} />
            <ConfirmationDialog open={deleteDialog.open} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete} title="Conferma Eliminazione" description="Sei sicuro?" isLoading={isLoading} />
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}><Alert severity={notification.severity}>{notification.message}</Alert></Snackbar>
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}><RapportinoPrint ref={printRef} rapportino={printState.rapportinoToPrint} /></div>
        </LocalizationProvider>
    );
};

export default RapportiniListPage;
