
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Paper, Typography, Button, Box,
    Grid, TextField, Autocomplete,
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

// Store e servizi
import { useGlobalStore } from '@/stores/globalStore'; 
import { Rapportino, Tecnico, Nave, Cliente } from '@/models/definitions';
import RapportiniTable from '@/components/Rapportini/RapportiniTable';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import PdfPreviewDialog from '@/components/Rapportini/PdfPreviewDialog';
import RapportinoPrint from '@/components/Rapportini/RapportinoPrint';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';

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

const createMap = <T extends { id: string }>(items: T[]): Map<string, T> => {
    return new Map(items.map(item => [item.id, item]));
};

const RapportiniListPage = () => {
    const navigate = useNavigate();
    
    // Hook allo store globale per ottenere dati e azioni
    const {
        rapportini, tecnici, clienti, navi, removeRapportino, showNotification, getRapportinoById, areAnagraficheLoading
    } = useGlobalStore(state => ({ 
        rapportini: state.rapportini,
        tecnici: state.tecnici,
        clienti: state.clienti,
        navi: state.navi,
        removeRapportino: state.removeRapportino,
        showNotification: state.showNotification,
        getRapportinoById: state.getRapportinoById,
        areAnagraficheLoading: state.areAnagraficheLoading,
    }));

    // Mappe per la ricerca veloce delle anagrafiche
    const tecniciMap = useMemo(() => createMap(tecnici), [tecnici]);
    const naviMap = useMemo(() => createMap(navi), [navi]);
    const clientiMap = useMemo(() => createMap(clienti), [clienti]);

    const [filters, setFilters] = useState<FilterState>({
        dataDa: dayjs().subtract(3, 'month').startOf('month'), 
        dataA: dayjs().endOf('month'), 
        tecnicoId: null, naveId: null, clienteId: null,
    });

    const [deleteDialog, setDeleteDialog] = useState({ open: false, rapportinoId: '' });
    const [detailRapportino, setDetailRapportino] = useState<Rapportino | null>(null);
    const [printState, setPrintState] = useState<PrintState>({ isGenerating: false, pdfDataUrl: null, rapportinoToPrint: null });
    const [isDeleting, setIsDeleting] = useState(false);
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
            const rapportinoDate = dayjs(r.data);
            if (!rapportinoDate.isValid()) return false;
            if (filters.dataDa && rapportinoDate.isBefore(filters.dataDa, 'day')) return false;
            if (filters.dataA && rapportinoDate.isAfter(filters.dataA, 'day')) return false;
            if (filters.tecnicoId && r.tecnicoId !== filters.tecnicoId && !(r.presenze || []).includes(filters.tecnicoId)) return false;
            if (filters.naveId && r.naveId !== filters.naveId) return false;
            return true;
        });
    }, [rapportini, filters]);

    const handleRowClick = (rapportino: Rapportino) => {
        const fullRapportino = getRapportinoById(rapportino.id);
        setDetailRapportino(fullRapportino || rapportino);
    };

    const handleCloseDetail = () => setDetailRapportino(null);

    const handleOpenDeleteDialog = (idToDelete: string) => setDeleteDialog({ open: true, rapportinoId: idToDelete });

    const handleCloseDeleteDialog = () => !isDeleting && setDeleteDialog({ open: false, rapportinoId: '' });

    const handleConfirmDelete = async () => {
        if (!deleteDialog.rapportinoId) return;
        setIsDeleting(true);
        try {
            await rapportinoCloudService.delete(deleteDialog.rapportinoId);
            removeRapportino(deleteDialog.rapportinoId);
            showNotification('Rapportino eliminato con successo!', 'success');
        } catch (error) {
            console.error("Errore eliminazione rapportino:", error);
            showNotification("Impossibile eliminare il rapportino.", 'error');
        } finally {
            setIsDeleting(false);
            handleCloseDeleteDialog();
        }
    };
    
    // NUOVA LOGICA DI STAMPA - Correzione AZIONE P.2
    const handlePrint = useCallback((rapportinoStub: Rapportino) => {
        const rapportinoCompleto = getRapportinoById(rapportinoStub.id); // Prende i dati completi dallo store

        if (!rapportinoCompleto) {
            showNotification("Dati del rapportino non trovati. Impossibile stampare.", "error");
            return;
        }

        // Passa il rapportino completo allo stato di stampa per il rendering
        setPrintState({ isGenerating: true, pdfDataUrl: null, rapportinoToPrint: rapportinoCompleto });
    }, [getRapportinoById, showNotification]);

    // La generazione del PDF ora avviene in un side-effect quando `printState` cambia
    React.useEffect(() => {
        if (printState.isGenerating && printState.rapportinoToPrint && printRef.current) {
            const generatePdf = async () => {
                 setTimeout(async () => {
                    if (!printRef.current) return;
                    try {
                        const canvas = await html2canvas(printRef.current, { scale: 2.5, useCORS: true });
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = pdf.internal.pageSize.getHeight();
                        const imgData = canvas.toDataURL('image/png', 1.0);
                        const imgWidth = pdfWidth;
                        const imgHeight = canvas.height * imgWidth / canvas.width;

                        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                        const pdfUrl = pdf.output('datauristring');
                        setPrintState(prev => ({ ...prev, isGenerating: false, pdfDataUrl: pdfUrl }));
                    } catch (error) {
                        console.error("Errore generazione PDF:", error);
                        showNotification("Errore durante la creazione del PDF.", "error");
                        setPrintState(prev => ({...prev, isGenerating: false, rapportinoToPrint: null }));
                    }
                }, 250); // Aumentato leggermente il timeout per sicurezza
            };
            generatePdf();
        }
    }, [printState.isGenerating, printState.rapportinoToPrint, showNotification]);


    const handleClosePrintDialog = () => setPrintState({ isGenerating: false, pdfDataUrl: null, rapportinoToPrint: null });

    const handleShare = useCallback(async () => {
        if (!printState.pdfDataUrl || !printState.rapportinoToPrint) return;
        try {
            const response = await fetch(printState.pdfDataUrl);
            const blob = await response.blob();
            const fileName = `Rapportino_${printState.rapportinoToPrint.id}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: `Rapportino ${printState.rapportinoToPrint.id}` });
            } else {
                const link = document.createElement('a');
                link.href = printState.pdfDataUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Share/Download fallito:', error);
            showNotification('Operazione fallita.', 'error');
        }
    }, [printState.pdfDataUrl, printState.rapportinoToPrint]);

    const handleEdit = useCallback((rapportino: Rapportino) => navigate(`/rapportino/edit/${rapportino.id}`), [navigate]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">Elenco Rapportini</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/rapportino/edit/new')}>
                        Nuovo
                    </Button>
                </Box>

                <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>Filtri</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="Dal" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="Al" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={tecnici} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={tecnici.find(t => t.id === filters.tecnicoId) || null} onChange={(_, v) => handleFilterChange('tecnicoId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Tecnico" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={navi} getOptionLabel={o => o.nome || ''} value={navi.find(n => n.id === filters.naveId) || null} onChange={(_, v) => handleFilterChange('naveId', v?.id || null)} renderInput={(params) => <TextField {...params} label="Nave" />} /></Grid>
                        <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                            <Button onClick={resetFilters} variant="outlined">Azzera</Button>
                        </Grid>
                    </Grid>
                </Paper>

                <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <RapportiniTable 
                        rapportini={filteredRapportini}
                        onRowClick={handleRowClick}
                        onEdit={handleEdit}
                        onDelete={handleOpenDeleteDialog}
                        onPrint={handlePrint} // Il gestore `handlePrint` è stato aggiornato
                        tecniciMap={tecniciMap}
                        naviMap={naviMap}
                        loading={areAnagraficheLoading}
                    />
                </Paper>
            </Box>
            
            {/* Dialog di dettaglio - ORA USA ANCHE LUI IL NUOVO FLUSSO DI STAMPA */}
            {detailRapportino && (
                <Dialog open={!!detailRapportino} onClose={handleCloseDetail} fullWidth maxWidth="lg" PaperProps={{ sx: { height: '90vh' } }}>
                    <DialogTitle>
                        Dettaglio Rapportino
                        <IconButton aria-label="close" onClick={handleCloseDetail} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        {/* Passa tutte le anagrafiche, come prima */}
                        <RapportinoPrint rapportino={detailRapportino} tecnici={tecnici} navi={navi} clienti={clienti} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDetail}>Chiudi</Button>
                        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => handlePrint(detailRapportino)}>Stampa / PDF</Button>
                    </DialogActions>
                </Dialog>
            )}
            
            {/* Componente di rendering nascosto per la generazione del PDF */}
            {printState.rapportinoToPrint && (
                 <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', background: 'white', zIndex: -1 }}>
                    <div ref={printRef}>
                        <RapportinoPrint 
                            rapportino={printState.rapportinoToPrint} 
                            tecnici={tecnici} 
                            navi={navi} 
                            clienti={clienti} 
                        />
                    </div>
                </div>
            )}

            <PdfPreviewDialog
                open={!!printState.pdfDataUrl && !printState.isGenerating}
                onClose={handleClosePrintDialog}
                onShare={handleShare}
                pdfDataUrl={printState.pdfDataUrl}
                isGenerating={printState.isGenerating}
                fileName={printState.rapportinoToPrint ? `Rapportino_${dayjs(printState.rapportinoToPrint.data).format('YYYY-MM-DD')}.pdf` : 'Rapportino.pdf'}
            />

            <ConfirmationDialog 
                open={deleteDialog.open}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Conferma Eliminazione"
                description="Vuoi davvero eliminare questo rapportino? L'azione è permanente."
                confirmText="Elimina"
                isLoading={isDeleting}
            />
        </LocalizationProvider>
    );
};

export default RapportiniListPage;
