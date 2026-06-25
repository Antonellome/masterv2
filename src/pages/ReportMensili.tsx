import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Paper, Typography, Box, Grid, Autocomplete, TextField, CircularProgress, Tooltip, Button } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { useData } from '@/hooks/useData';
import { Rapportino, Tecnico, EnrichedRapportino, RiepilogoMese, MasterData } from '@/models/definitions';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-print/Print';
import CheckIcon from '@mui/icons-material/Check';
import { useAlert } from '@/contexts/AlertContext';
import { calculateMonthlyReportData } from '@/services/reportService';
import { generateMonthlyReportPDF } from '@/services/pdfMonthlyReportService';
import PdfPreviewDialog from '@/components/Rapportini/PdfPreviewDialog';

dayjs.locale('it');

// Funzione di debug per scrivere su file
const writeDebugData = async (data: any) => {
    try {
        // Usa un'API fittizia o un metodo per inviare i dati a un file
        // Nel nostro ambiente, useremo un comando speciale tramite console.
        console.log("DEBUG_DATA_START");
        console.log(JSON.stringify(data, null, 2));
        console.log("DEBUG_DATA_END");
    } catch (error) {
        console.error("Errore nella scrittura del file di debug:", error);
    }
};


const ReportMensili: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const anagrafiche = useData();
    const { tecnici, clienti, navi, luoghi, tipiGiornata, veicoli, loading: anagraficheLoading } = anagrafiche;
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [rapportiniLoading, setRapportiniLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);

    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfFileName, setPdfFileName] = useState('report.pdf');

    // DEBUG: Aggiungi un effetto per scrivere i dati di tipiGiornata quando cambiano
    useEffect(() => {
        if (tipiGiornata && tipiGiornata.length > 0) {
            const debugData = { tipiGiornata };
            // Scrive i dati in un file per l'analisi
            // Nota: questa chiamata è solo un esempio, l'effettiva scrittura avverrà tramite tool
             writeDebugData(debugData);
        }
    }, [tipiGiornata]);

    useEffect(() => {
        setRapportiniLoading(true);
        const unsub = onSnapshot(collection(db, 'rapportini'), snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
            setRapportini(data);
            setRapportiniLoading(false);
        }, () => {
            showAlert('Errore nel caricamento dei rapportini', 'error');
            setRapportiniLoading(false);
        });
        return () => unsub();
    }, [showAlert]);

    const monthlyReportData = useMemo(() => {
        if (!selectedTecnico || anagraficheLoading || !tipiGiornata?.length) {
            return { rapportiniArricchiti: [], riepilogoMese: null };
        }
        const masterData: MasterData = { ...anagrafiche, tipiGiornata: anagrafiche.tipiGiornata || [] };
        return calculateMonthlyReportData(rapportini, masterData, selectedTecnico.id, selectedMonth.toDate());
    }, [rapportini, selectedMonth, selectedTecnico, anagrafiche, anagraficheLoading, tipiGiornata]);

    const { rapportiniArricchiti, riepilogoMese } = monthlyReportData;

    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);

    const handlePrintMonthlyReport = async () => {
        if (!riepilogoMese || !selectedTecnico) return;
        setIsGeneratingPdf(true);
        try {
            const masterData = { ...anagrafiche, tipiGiornata: anagrafiche.tipiGiornata || [] };
            const pdfBlob = await generateMonthlyReportPDF(rapportiniArricchiti, riepilogoMese, selectedTecnico, selectedMonth.toDate(), masterData);
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            setPdfFileName(`Report_${selectedTecnico.cognome}_${selectedMonth.format('MM-YYYY')}.pdf`);
            setIsPdfPreviewOpen(true);
        } catch (error) {
            console.error("Errore PDF: ", error);
            showAlert("Errore durante la generazione del PDF.", "error");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleClosePdfPreview = () => {
        setIsPdfPreviewOpen(false);
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
    };

    const columns: GridColDef<EnrichedRapportino>[] = [
        { field: 'data', headerName: 'Data', width: 110, valueGetter: (params) => dayjs(params.row.data).format('DD/MM/YYYY') },
        { field: 'cliente', headerName: 'Cliente', flex: 1, valueGetter: (params) => clienti.find(c => c.id === navi.find(n => n.id === params.row.naveId)?.clienteId)?.nome || 'N/D' },
        { field: 'nave', headerName: 'Nave', flex: 1, valueGetter: (params) => navi.find(n => n.id === params.row.naveId)?.nome || 'N/D' },
        { field: 'tipoGiornata', headerName: 'Tipo Giornata', flex: 1, valueGetter: (params) => params.row.tipoGiornata?.nome || 'N/D' },
        { field: 'oreOrdinarie', headerName: 'Ord.', width: 70, align: 'right', headerAlign: 'right' },
        { field: 'oreStraordinarie', headerName: 'Straord.', width: 80, align: 'right', headerAlign: 'right' },
        { field: 'isTrasferta', headerName: 'Trasf.', width: 70, align: 'center', headerAlign: 'center', renderCell: params => params.row.trasfertaId ? <CheckIcon color="primary" /> : null },
        { field: 'firmato', headerName: 'Firmato', width: 80, align: 'center', headerAlign: 'center', renderCell: params => params.row.firmaVettoriale ? <Tooltip title="Firmato"><CheckIcon color="success" /></Tooltip> : null },
        { field: 'actions', type: 'actions', width: 60, getActions: ({ id }) => [<GridActionsCellItem icon={<Tooltip title="Modifica"><EditIcon /></Tooltip>} label="Modifica" onClick={() => handleEdit(id as string)} />] },
    ];

    if (anagraficheLoading || rapportiniLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
                     <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                        <Grid item><Typography variant="h5">Report Mensile Tecnico</Typography></Grid>
                        <Grid item>
                            <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintMonthlyReport} disabled={!selectedTecnico || isGeneratingPdf || !riepilogoMese}>
                                {isGeneratingPdf ? 'Generazione...' : 'Stampa Report'}
                            </Button>
                        </Grid>
                    </Grid>
                    <Grid container spacing={2} alignItems="center" sx={{mt: 1}}>
                        <Grid item xs={12} sm={6}>
                            <DatePicker views={['month', 'year']} label="Mese e Anno" value={selectedMonth} onChange={(d) => setSelectedMonth(d || dayjs())} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={tecnici.sort((a, b) => (`${a.cognome} ${a.nome}`).localeCompare(`${b.cognome} ${b.nome}`))}
                                getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                                value={selectedTecnico}
                                onChange={(_, newValue) => setSelectedTecnico(newValue)}
                                renderInput={(params) => <TextField {...params} label="Seleziona Tecnico" />}
                                disableClearable
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {selectedTecnico && riepilogoMese && (
                    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6">Riepilogo per {selectedTecnico.cognome} {selectedTecnico.nome} - {selectedMonth.format('MMMM YYYY')}</Typography>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6} sm={4} md={2}><Typography>Ore Ordinarie: <strong>{riepilogoMese.oreOrdinarie}</strong></Typography></Grid>
                            <Grid item xs={6} sm={4} md={2}><Typography>Ore Straordinarie: <strong>{riepilogoMese.oreStraordinarie}</strong></Typography></Grid>
                            <Grid item xs={6} sm={4} md={2}><Typography>Ore Totali: <strong>{riepilogoMese.oreTotali}</strong></Typography></Grid>
                            <Grid item xs={6} sm={4} md={3}><Typography>Giorni Lavorati: <strong>{riepilogoMese.giorniTotaliLavorati}</strong></Typography></Grid>
                            <Grid item xs={6} sm={4} md={3}><Typography>Giorni Trasferta: <strong>{riepilogoMese.giorniTrasferta}</strong></Typography></Grid>
                            <Grid item xs={12}><Typography variant="h6" sx={{mt: 2}}>Costo Totale Mensile: <strong>{riepilogoMese.costoTotale.toFixed(2)} €</strong></Typography></Grid>
                        </Grid>
                    </Paper>
                )}

                {selectedTecnico && (
                    <Paper sx={{ height: 600, width: '100%' }}>
                        <DataGrid rows={rapportiniArricchiti} columns={columns} density="compact" rowHeight={42} loading={rapportiniLoading} initialState={{ sorting: { sortModel: [{ field: 'data', sort: 'desc' }] } }} />
                    </Paper>
                )}

                <PdfPreviewDialog
                    open={isPdfPreviewOpen}
                    onClose={handleClosePdfPreview}
                    onShare={async () => {
                        if (!pdfUrl) return;
                        try {
                            const response = await fetch(pdfUrl);
                            const blob = await response.blob();
                            const file = new File([blob], pdfFileName, { type: 'application/pdf' });
                            if (navigator.share) await navigator.share({ files: [file], title: pdfFileName.replace('.pdf', '') });
                        } catch (err) {
                            showAlert('Condivisione non riuscita.', 'error');
                        }
                    }}
                    pdfDataUrl={pdfUrl}
                    isGenerating={isGeneratingPdf}
                    fileName={pdfFileName}
                />
            </Box>
        </LocalizationProvider>
    );
};

export default ReportMensili;
