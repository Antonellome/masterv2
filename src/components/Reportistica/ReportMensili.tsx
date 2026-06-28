
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, 
    Typography, 
    Button, 
    CircularProgress, 
    Autocomplete, 
    TextField, 
    Paper, 
    Alert, 
    Grid
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DataGrid, GridColDef, GridFooterContainer, GridToolbar, GridRowParams } from '@mui/x-data-grid';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useData } from '@/hooks/useData';
import { Rapportino, Tecnico, EnrichedRapportino, RiepilogoMese } from '@/models/definitions';
import { calculateMonthlyReportData } from '@/services/reportService';
import { generateMonthlyReportPDF } from '@/services/pdfMonthlyReportService';
import PdfPreviewDialog from './PdfPreviewDialog';
import { startOfMonth, endOfMonth } from 'date-fns';

dayjs.locale('it');

const ReportMensili = () => {
    const navigate = useNavigate();
    const anagrafiche = useData();
    const { tecnici, loading: anagraficheLoading, error: anagraficheError } = anagrafiche;
    
    // Stati per la UI e i filtri
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs());

    // Stati per il risultato
    const [rapportiniArricchiti, setRapportiniArricchiti] = useState<EnrichedRapportino[]>([]);
    const [riepilogoMese, setRiepilogoMese] = useState<RiepogoMese | null>(null);

    // Stati di caricamento e UI
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportGenerated, setReportGenerated] = useState(false);
    
    const [isExporting, setIsExporting] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

    const handleGenerateReport = useCallback(async () => {
        if (!selectedTecnico || !selectedMonth) {
            setReportError("Per favore, seleziona un tecnico e un mese validi.");
            return;
        }

        setReportLoading(true);
        setReportError(null);
        setReportGenerated(false);

        try {
            const monthStart = startOfMonth(selectedMonth.toDate());
            const monthEnd = endOfMonth(selectedMonth.toDate());

            const q = query(collection(db, "rapportini"),
                where("tecnicoId", "==", selectedTecnico.id),
                where("data", ">=", monthStart),
                where("data", "<=", monthEnd)
            );

            const querySnapshot = await getDocs(q);
            const rapportiniData = querySnapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    data: data.data instanceof Timestamp ? data.data.toDate() : new Date(data.data)
                } as Rapportino;
            });

            if (rapportiniData.length === 0) {
                 setRapportiniArricchiti([]);
                 setRiepilogoMese(null);
            } else {
                const { rapportiniArricchiti: processedRapportini, riepilogoMese: processedRiepilogo } = 
                    calculateMonthlyReportData(rapportiniData, anagrafiche, selectedTecnico.id, selectedMonth.toDate());
                
                setRapportiniArricchiti(processedRapportini);
                setRiepilogoMese(processedRiepilogo);
            }
            
        } catch (error) {
            console.error("Errore durante la generazione del report:", error);
            setReportError("Si è verificato un errore durante la generazione del report. Controlla la console per i dettagli.");
            setRapportiniArricchiti([]);
            setRiepilogoMese(null);
        } finally {
            setReportLoading(false);
            setReportGenerated(true);
        }
    }, [selectedTecnico, selectedMonth, anagrafiche]);

    const handleRowClick = (params: GridRowParams) => {
        navigate(`/rapportino/edit/${params.id}`);
    };

    const handleOpenPdfPreview = async () => {
        if (!riepilogoMese || !selectedTecnico || !selectedMonth || !anagrafiche || !rapportiniArricchiti) return;
        
        setIsExporting(true);
        setPdfPreviewOpen(true);
        
        try {
            const pdfBlob = await generateMonthlyReportPDF(rapportiniArricchiti, riepilogoMese, selectedTecnico, selectedMonth.toDate(), anagrafiche);
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
        } catch (error) {
            console.error("Errore durante la generazione del PDF:", error);
            setReportError("C'è stato un problema nella creazione del PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleClosePdfPreview = () => {
        setPdfPreviewOpen(false);
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
    };
    
    const columns: GridColDef<EnrichedRapportino>[] = [
        {
            field: 'dataFormatted',
            headerName: 'Data',
            width: 120,
        },
        {
            field: 'tipoGiornataNome',
            headerName: 'Tipo Giornata',
            flex: 1,
        },
        {
            field: 'naveNome',
            headerName: 'Nave',
            flex: 1,
        },
        {
            field: 'luogoNome',
            headerName: 'Luogo',
            flex: 1,
        },
        { field: 'oreOrdinarie', headerName: 'Ordinarie', width: 100, type: 'number' },
        { field: 'oreStraordinarie', headerName: 'Straordinarie', width: 110, type: 'number' },
        { field: 'oreGiorno', headerName: 'Totale Giorno', width: 120, type: 'number' },
    ];

    const CustomFooter = () => {
        if (!riepilogoMese) return null;
        return (
            <GridFooterContainer sx={{ justifyContent: 'space-between', p: 3, borderTop: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
                <Box sx={{ mb: { xs: 3, md: 0 }, flex: '1 1 50%' }}>
                    <Typography variant="h6" gutterBottom>Riepilogo per Tipo Giornata</Typography>
                </Box>
                <Box sx={{ textAlign: { md: 'right' }, flex: '1 1 40%' }}>
                    <Typography variant="h6" gutterBottom>Riepilogo Totale Mensile</Typography>
                    <Typography variant="body1">Ore Ordinarie: <strong>{riepilogoMese.oreOrdinarie}</strong></Typography>
                    <Typography variant="body1">Ore Straordinarie: <strong>{riepilogoMese.oreStraordinarie}</strong></Typography>
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #ccc' }}>
                        <Typography variant="h5">Totale Generale: {riepilogoMese.oreTotali} ore</Typography>
                    </Box>
                </Box>
            </GridFooterContainer>
        );
    };
    
    const loading = anagraficheLoading || reportLoading;
    const error = anagraficheError || reportError;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Paper sx={{ p: 3, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 2, flexShrink: 0 }}>
                     <Grid item xs={12} sm={6} md={4}>
                        <Autocomplete
                            options={tecnici.sort((a, b) => a.cognome.localeCompare(b.cognome))}
                            getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                            value={selectedTecnico}
                            onChange={(_, newValue) => {
                                setSelectedTecnico(newValue);
                                setReportGenerated(false); // Resetta quando il tecnico cambia
                                setRapportiniArricchiti([]);
                                setRiepilogoMese(null);
                            }}
                            renderInput={(params) => <TextField {...params} label="Seleziona Tecnico" fullWidth />}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                    </Grid>
                     <Grid item xs={12} sm={6} md={3}>
                        <DatePicker
                            label="Seleziona Mese"
                            views={['month', 'year']}
                            value={selectedMonth}
                            onChange={(newMonth) => {
                                setSelectedMonth(newMonth);
                                setReportGenerated(false); // Resetta quando il mese cambia
                                setRapportiniArricchiti([]);
                                setRiepilogoMese(null);
                            }}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button 
                            variant="contained" 
                            onClick={handleGenerateReport} 
                            disabled={loading || !selectedTecnico || !selectedMonth || isExporting}
                            fullWidth
                            size="large"
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Genera'}
                        </Button>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button 
                            variant="outlined"
                            onClick={handleOpenPdfPreview} 
                            disabled={!reportGenerated || isExporting || !rapportiniArricchiti || rapportiniArricchiti.length === 0}
                            fullWidth
                            size="large"
                        >
                            {isExporting ? <CircularProgress size={24} /> : 'Esporta PDF'}
                        </Button>
                    </Grid>
                </Grid>

                {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}

                {(reportGenerated && !reportLoading) && (
                    <Box sx={{ flexGrow: 1, width: '100%', mt: 2 }}>
                         <DataGrid
                            rows={rapportiniArricchiti}
                            columns={columns}
                            slots={{ toolbar: GridToolbar, footer: CustomFooter }}
                            density="compact"
                            onRowClick={handleRowClick}
                            disableRowSelectionOnClick
                            localeText={{ noRowsLabel: "Nessun rapportino trovato per il tecnico e il mese selezionati." }}
                            sx={{ '& .MuiDataGrid-row:hover': { cursor: 'pointer' } }}
                        />
                    </Box>
                )}
                 {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5, flexDirection: 'column', alignItems: 'center' }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Caricamento dati...</Typography>
                    </Box>
                )}

                <PdfPreviewDialog 
                    open={pdfPreviewOpen}
                    onClose={handleClosePdfPreview}
                    pdfUrl={pdfUrl}
                    isGenerating={isExporting}
                    fileName={`report_mensile_${selectedTecnico?.cognome}_${selectedMonth?.format('MM-YYYY')}.pdf`}
                />
            </Paper>
        </LocalizationProvider>
    );
};

export default ReportMensili;
