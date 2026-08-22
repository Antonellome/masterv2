
// Cache-busting comment
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Paper, Typography, Button, Box,
    Grid, TextField, Autocomplete, Snackbar, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton
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

import { useGlobalStore } from '@/stores/globalStore';
import { Rapportino } from '@/models/definitions';
import RapportiniTable from '@/components/Rapportini/RapportiniTable';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import PdfPreviewDialog from '@/components/Rapportini/PdfPreviewDialog';
import RapportinoPrint from '@/components/Rapportini/RapportinoPrint'; 
import { deleteRapportino as deleteRapportinoService } from '@/services/rapportiniService';

dayjs.locale('it');

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
    
    const {
        rapportini, tecnici, clienti, navi, removeRapportino, showNotification, getRapportinoById
    } = useGlobalStore(state => ({ ...state, getRapportinoById: state.getRapportinoById }));

    const [filters, setFilters] = useState<FilterState>({
        dataDa: dayjs().subtract(3, 'month').startOf('month'), 
        dataA: dayjs().endOf('month'), 
        tecnicoId: null, naveId: null, clienteId: null,
    });

    const [deleteDialog, setDeleteDialog] = useState({ open: false, rapportinoId: '' });
    const [detailRapportino, setDetailRapportino] = useState<Rapportino | null>(null);
    const [printState, setPrintState] = useState<PrintState>({ 
        isGenerating: false, 
        pdfDataUrl: null,
        rapportinoToPrint: null
    });

    const [isLoading, setIsLoading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const handleFilterChange = <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };
    const resetFilters = useCallback(() => {
        setFilters({
            dataDa: dayjs().subtract(3, 'month').startOf('month'), 
            dataA: dayjs().endOf('month'), 
            tecnicoId: null, naveId: null, clienteId: null
        });
    }, []);

    const filteredRapportini = useMemo(() => {
        if (!rapportini) return [];
        return rapportini.filter(r => {
            // **ULTIMATE FIX**: Use `data` field for filtering and ensure it's a valid Dayjs object.
            const rapportinoDate = dayjs(r.data);
            if (!rapportinoDate.isValid()) return false; 

            if (filters.dataDa && rapportinoDate.isBefore(filters.dataDa, 'day')) return false;
            if (filters.dataA && rapportinoDate.isAfter(filters.dataA, 'day')) return false;
            if (filters.tecnicoId && r.tecnicoId !== filters.tecnicoId && !r.presenze?.includes(filters.tecnicoId)) return false;
            if (filters.naveId && r.naveId !== filters.naveId) return false;
            if (filters.clienteId && r.clienteId !== filters.clienteId) return false;
            return true;
        });
    }, [rapportini, filters]);

    const handleRowClick = (rapportino: Rapportino) => {
        const fullRapportino = getRapportinoById(rapportino.id);
        setDetailRapportino(fullRapportino || rapportino);
    };
    const handleCloseDetail = () => {
        setDetailRapportino(null);
    };

    const handleOpenDeleteDialog = (idToDelete: string) => {
        setDeleteDialog({ open: true, rapportinoId: idToDelete });
    };
    const handleCloseDeleteDialog = () => {
        if (!isLoading) setDeleteDialog({ open: false, rapportinoId: '' });
    };
    const handleConfirmDelete = async () => {
        if (!deleteDialog.rapportinoId) return;
        setIsLoading(true);
        try {
            await deleteRapportinoService(deleteDialog.rapportinoId);
            removeRapportino(deleteDialog.rapportinoId);
            showNotification('Rapportino eliminato con successo!', 'success');
        } catch (error) {
            showNotification("Impossibile eliminare il rapportino.", 'error');
        } finally {
            setIsLoading(false);
            handleCloseDeleteDialog();
        }
    };

    const handlePrint = useCallback(async (rapportinoStub: Rapportino) => {
        if (!rapportinoStub.id) return;
        
        const rapportinoToPrint = getRapportinoById(rapportinoStub.id);
        if (!rapportinoToPrint) {
            showNotification("Rapportino non trovato, potrebbe essere stato rimosso.", "error");
            return;
        }

        setPrintState({ isGenerating: true, pdfDataUrl: null, rapportinoToPrint });

        setTimeout(async () => {
            if (printRef.current) {
                try {
                    const canvas = await html2canvas(printRef.current, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const ratio = canvas.width / canvas.height;
                    const imgHeightOnPdf = pdfWidth / ratio;

                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeightOnPdf);
                    
                    const pdfUrl = pdf.output('datauristring');
                    setPrintState(prev => ({ ...prev, isGenerating: false, pdfDataUrl: pdfUrl }));
                } catch (error) {
                    showNotification("Errore durante la generazione del PDF", "error");
                    setPrintState(prev => ({...prev, isGenerating: false }));
                }
            }
        }, 100);
    }, [showNotification, getRapportinoById]);

    const handleClosePrintDialog = () => {
        setPrintState({ isGenerating: false, pdfDataUrl: null, rapportinoToPrint: null });
    }

    const handleShare = async () => {
        if (!printState.pdfDataUrl || !printState.rapportinoToPrint?.id) return;
        try {
            const response = await fetch(printState.pdfDataUrl);
            const blob = await response.blob();
            const fileName = `Rapportino-${printState.rapportinoToPrint.id}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });
            const shareData = { files: [file], title: `Rapportino ${printState.rapportinoToPrint.id}` };
            if (navigator.share && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                showNotification('PDF condiviso con successo!', 'success');
            } else {
                showNotification('Condivisione non supportata. Scarica il PDF.', 'info');
            }
        } catch (error) {
            showNotification('Condivisione fallita.', 'error');
        }
    };

    const handleEdit = useCallback((rapportino: Rapportino) => navigate(`/rapportino/edit/${rapportino.id}`), [navigate]);

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
                       <Grid
                           size={{
                               xs: 12,
                               sm: 6,
                               md: 3
                           }}><DatePicker label="Dal" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><DatePicker label="Al" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, variant: 'outlined' } }} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={tecnici} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={tecnici.find(t => t.id === filters.tecnicoId) || null} onChange={(_, v) => handleFilterChange('tecnicoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tecnico" variant="outlined" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={clienti} getOptionLabel={o => o.nome || ''} value={clienti.find(c => c.id === filters.clienteId) || null} onChange={(_, v) => handleFilterChange('clienteId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Cliente" variant="outlined" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Autocomplete options={navi} getOptionLabel={o => o.nome || ''} value={navi.find(n => n.id === filters.naveId) || null} onChange={(_, v) => handleFilterChange('naveId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Nave" variant="outlined" />} /></Grid>
                        <Grid
                            display="flex"
                            justifyContent="flex-end"
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}><Button onClick={resetFilters} variant="outlined" size="large">Azzera</Button></Grid>
                    </Grid>
                </Paper>

                <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <RapportiniTable 
                        rapportini={filteredRapportini}
                        onRowClick={handleRowClick}
                        onEdit={handleEdit}
                        onDelete={handleOpenDeleteDialog}
                        onPrint={handlePrint}
                    />
                </Paper>
            </Box>
            {detailRapportino && (
                <Dialog 
                    open={!!detailRapportino} 
                    onClose={handleCloseDetail}
                    fullWidth
                    maxWidth="md"
                    PaperProps={{ sx: { height: '90vh', maxHeight: '90vh' } }}
                >
                    <DialogTitle>
                        Dettaglio Rapportino #{detailRapportino.id}
                        <IconButton
                            aria-label="close"
                            onClick={handleCloseDetail}
                            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <RapportinoPrint rapportino={detailRapportino} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDetail}>Chiudi</Button>
                        <Button 
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={() => {
                                if (detailRapportino) {
                                    handlePrint(detailRapportino);
                                    handleCloseDetail();
                                }
                            }}
                        >
                            Stampa / PDF
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
            {printState.rapportinoToPrint && (
                 <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <RapportinoPrint ref={printRef} rapportino={printState.rapportinoToPrint} />
                </div>
            )}
            <PdfPreviewDialog
                open={!!printState.pdfDataUrl}
                onClose={handleClosePrintDialog}
                onShare={handleShare}
                pdfDataUrl={printState.pdfDataUrl}
                isGenerating={printState.isGenerating}
                fileName={printState.rapportinoToPrint ? `Rapportino-${printState.rapportinoToPrint.id}.pdf` : 'Rapportino.pdf'}
            />
            <ConfirmationDialog 
                open={deleteDialog.open}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Conferma Eliminazione"
                description="Sei sicuro di voler eliminare questo rapportino? L'azione è irreversibile."
                confirmText="Elimina"
                isLoading={isLoading}
            />
            <Snackbar open={!!useGlobalStore.getState().notification.message} autoHideDuration={6000} onClose={() => showNotification('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => showNotification('')} severity={useGlobalStore.getState().notification.severity} sx={{ width: '100%' }}>
                    {useGlobalStore.getState().notification.message}
                </Alert>
            </Snackbar>
        </LocalizationProvider>
    );
};

export default RapportiniListPage;
