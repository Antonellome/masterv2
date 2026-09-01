import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Paper, Typography, Button, Box,
    Grid, TextField, Autocomplete, Snackbar, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import AddIcon from '@mui/icons-material/Add';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Rapportino } from '@/models/definitions';
import RapportiniTable from '@/components/Rapportini/RapportiniTable';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import PdfPreviewDialog from '@/components/Rapportini/PdfPreviewDialog';
import RapportinoPrint from '@/components/Rapportini/RapportinoPrint'; 
import { logger } from '@/utils/logger';

dayjs.locale('it');

// Placeholder per la sincronizzazione con il cloud
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

interface PrintState {
    isGenerating: boolean;
    pdfDataUrl: string | null;
    rapportinoToPrint: Rapportino | null;
}

const RapportiniListPage = () => {
    const navigate = useNavigate();

    // 1. CARICAMENTO REATTIVO DA DEXIE
    const rapportini = useLiveQuery(() => db.rapportini.toArray(), []);
    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const clienti = useLiveQuery(() => db.clienti.toArray(), []);
    const navi = useLiveQuery(() => db.navi.toArray(), []);

    const isLoadingData = !rapportini || !tecnici || !clienti || !navi;

    const [filters, setFilters] = useState<FilterState>({
        dataDa: dayjs().subtract(3, 'month').startOf('month'), 
        dataA: dayjs().endOf('month'), 
        tecnicoId: null, naveId: null, clienteId: null,
    });

    const [deleteDialog, setDeleteDialog] = useState({ open: false, rapportinoId: '' });
    const [detailRapportino, setDetailRapportino] = useState<Rapportino | null>(null);
    const [printState, setPrintState] = useState<PrintState>({ isGenerating: false, pdfDataUrl: null, rapportinoToPrint: null });
    const [isLoading, setIsLoading] = useState(false); // Per operazioni come delete, non per il caricamento dati
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

    const handlePrint = useCallback(async (rapportinoStub: Rapportino) => {
        const rapportinoToPrint = getRapportinoById(rapportinoStub.id);
        if (!rapportinoToPrint) {
            setNotification({ open: true, message: "Rapportino non trovato.", severity: "error" });
            return;
        }
        setPrintState({ isGenerating: true, pdfDataUrl: null, rapportinoToPrint });

        setTimeout(async () => {
            if (printRef.current) {
                try {
                    const canvas = await html2canvas(printRef.current, { scale: 2 });
                    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), 0);
                    setPrintState(prev => ({ ...prev, isGenerating: false, pdfDataUrl: pdf.output('datauristring') }));
                } catch (error) {
                    setNotification({ open: true, message: "Errore generazione PDF", severity: "error" });
                    setPrintState(prev => ({...prev, isGenerating: false }));
                }
            }
        }, 100);
    }, [getRapportinoById]);
    const handleClosePrintDialog = () => setPrintState({ isGenerating: false, pdfDataUrl: null, rapportinoToPrint: null });
    
    const handleShare = async () => {/* ... logica invariata ... */};
    const handleEdit = useCallback((rapportino: Rapportino) => navigate(`/rapportino/edit/${rapportino.id}`), [navigate]);

    if (isLoadingData) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">Elenco Rapportini</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/rapportino/edit/new')}>
                        Nuovo Rapportino
                    </Button>
                </Box>

                <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>Filtri Ricerca</Typography>
                    <Grid container spacing={2} alignItems="center">
                         <Grid item xs={12} md={3}><DatePicker label="Dal" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} /></Grid>
                         <Grid item xs={12} md={3}><DatePicker label="Al" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} /></Grid>
                         <Grid item xs={12} md={3}><Autocomplete options={tecnici || []} getOptionLabel={o => o.nome || ''} value={(tecnici || []).find(t => t.id === filters.tecnicoId) || null} onChange={(_, v) => handleFilterChange('tecnicoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tecnico" />} /></Grid>
                         <Grid item xs={12} md={3}><Autocomplete options={clienti || []} getOptionLabel={o => o.nome || ''} value={(clienti || []).find(c => c.id === filters.clienteId) || null} onChange={(_, v) => handleFilterChange('clienteId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Cliente" />} /></Grid>
                         <Grid item xs={12} md={3}><Autocomplete options={navi || []} getOptionLabel={o => o.nome || ''} value={(navi || []).find(n => n.id === filters.naveId) || null} onChange={(_, v) => handleFilterChange('naveId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Nave" />} /></Grid>
                         <Grid item xs={12} md={3}><Button onClick={resetFilters} variant="outlined" size="large">Azzera</Button></Grid>
                    </Grid>
                </Paper>

                <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <RapportiniTable rapportini={filteredRapportini} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleOpenDeleteDialog} onPrint={handlePrint} />
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
