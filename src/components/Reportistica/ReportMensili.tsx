
import React, { useState, useMemo } from 'react';
import { Paper, Typography, Box, Grid, Button, CircularProgress, Tooltip, TextField, Autocomplete } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '@/contexts/AlertContext';
import { calculateMonthlyReportData } from '@/services/reportService';
import { generateMonthlyReportPDF } from '@/services/pdfMonthlyReportService';
import PdfPreviewDialog from '@/components/Rapportini/PdfPreviewDialog';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import CheckIcon from '@mui/icons-material/Check';

import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCollectionData } from '@/hooks/useCollectionData';
import { EnrichedRapportino, MasterData, Rapportino, Tecnico, Cliente, Nave, TipoGiornata, Veicolo, Luogo, Impostazioni } from '@/models/definitions';

dayjs.locale('it');

const ReportMensili: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const rapportini = useLiveQuery(() => db.rapportini.toArray(), []) as Rapportino[] | undefined;
    const { data: tecnici, loading: lTecn } = useCollectionData<Tecnico>('tecnici');
    const { data: clienti, loading: lCli } = useCollectionData<Cliente>('clienti');
    const { data: navi, loading: lNav } = useCollectionData<Nave>('navi');
    const { data: luoghi, loading: lLuo } = useCollectionData<Luogo>('luoghi');
    const { data: tipiGiornata, loading: lTip } = useCollectionData<TipoGiornata>('tipiGiornata');
    const { data: veicoli, loading: lVei } = useCollectionData<Veicolo>('veicoli');
    const { data: impostazioni, loading: lImp } = useCollectionData<Impostazioni>('impostazioni');

    const masterDataLoading = lTecn || lCli || lNav || lLuo || lTip || lVei || lImp || rapportini === undefined;

    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
    
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfFileName, setPdfFileName] = useState('report.pdf');

    const sortedTecnici = useMemo(() => 
        [...(tecnici || [])].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`))
    , [tecnici]);

    const monthlyReportData = useMemo(() => {
        if (!selectedTecnico || masterDataLoading || !rapportini) {
            return { rapportiniArricchiti: [], riepilogoMese: null };
        }
        const masterData: MasterData = { 
            clienti: clienti || [], 
            navi: navi || [], 
            luoghi: luoghi || [],
            tipiGiornata: tipiGiornata || [], 
            tecnici: tecnici || [], 
            rapportini: rapportini, 
            veicoli: veicoli || [],
            impostazioni: impostazioni?.[0] || { id: '1', tariffe: [] }
        };
        return calculateMonthlyReportData(rapportini, masterData, selectedTecnico.id, selectedMonth.toDate());
    }, [rapportini, selectedTecnico, selectedMonth, masterDataLoading, clienti, navi, luoghi, tipiGiornata, tecnici, veicoli, impostazioni]);

    const { rapportiniArricchiti, riepilogoMese } = monthlyReportData;
    
    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);

    const handlePrintMonthlyReport = async () => {
        if (!riepilogoMese || !selectedTecnico || !rapportini) return;

        setIsGeneratingPdf(true);
        try {
            const masterData: MasterData = { 
                clienti: clienti || [], 
                navi: navi || [], 
                luoghi: luoghi || [],
                tipiGiornata: tipiGiornata || [], 
                tecnici: tecnici || [], 
                rapportini: rapportini, 
                veicoli: veicoli || [],
                impostazioni: impostazioni?.[0] || { id: '1', tariffe: [] }
            };
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
        { 
            field: 'data', 
            headerName: 'Data', 
            width: 100, 
            valueGetter: (params) => dayjs(params.row.data).format('DD/MM/YYYY')
        },
        {
            field: 'cliente',
            headerName: 'Cliente',
            flex: 1,
            valueGetter: (params) => {
                const nave = navi?.find(n => n.id === params.row.naveId);
                if (nave) return clienti?.find(c => c.id === nave.clienteId)?.nome || 'N/D';
                const luogo = luoghi?.find(l => l.id === params.row.luogoId);
                if (luogo) return clienti?.find(c => c.id === luogo.clienteId)?.nome || 'N/D';
                return '';
            }
        },
        { field: 'nave', headerName: 'Nave', flex: 1, valueGetter: (params) => navi?.find(n => n.id === params.row.naveId)?.nome || '' },
        { field: 'luogo', headerName: 'Luogo', flex: 1, valueGetter: (params) => luoghi?.find(l => l.id === params.row.luogoId)?.nome || '' },
        { field: 'oreGiorno', headerName: 'Ore Lavoro', width: 100, align: 'right', headerAlign: 'right' },
        {
            field: 'trasfertaId',
            headerName: 'Trasferta',
            width: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: params => params.value ? <CheckIcon color="primary" /> : null
        },
        { field: 'actions', type: 'actions', width: 60, getActions: ({ id }) => [
            <GridActionsCellItem icon={<Tooltip title="Modifica"><EditIcon /></Tooltip>} label="Modifica" onClick={() => handleEdit(id as string)} />
        ] },
    ];

    if (masterDataLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h5">Report Mensile Tecnico</Typography>

                <Paper sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                    <Autocomplete
                        options={sortedTecnici}
                        getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                        value={selectedTecnico}
                        onChange={(_, newValue) => setSelectedTecnico(newValue)}
                        renderInput={(params) => <TextField {...params} label="Seleziona Tecnico" />}
                        sx={{ minWidth: 250, flexGrow: 1 }}
                        noOptionsText="Nessun tecnico trovato"
                    />
                    <DatePicker 
                        views={['month', 'year']} 
                        label="Mese Report"
                        value={selectedMonth}
                        onChange={(newValue) => setSelectedMonth(newValue || dayjs())}
                    />
                </Paper>
                
                {selectedTecnico && (
                     <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, gap: 2 }}>
                        {riepilogoMese ? (
                            <Paper elevation={3} sx={{ p: 2, flexShrink: 0 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                                    <Typography variant="h6">
                                        Riepilogo per {selectedTecnico.cognome} {selectedTecnico.nome} - {selectedMonth.format('MMMM YYYY')}
                                    </Typography>
                                    <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintMonthlyReport} disabled={isGeneratingPdf}>
                                        {isGeneratingPdf ? 'Generazione...' : 'Stampa Report'}
                                    </Button>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} sm={4} md={2}><Typography>Ore Ordinarie: <strong>{riepilogoMese.oreOrdinarie}</strong></Typography></Grid>
                                    <Grid item xs={6} sm={4} md={2}><Typography>Ore Straordinarie: <strong>{riepilogoMese.oreStraordinarie}</strong></Typography></Grid>
                                    <Grid item xs={6} sm={4} md={2}><Typography>Ore Totali: <strong>{riepilogoMese.oreTotali}</strong></Typography></Grid>
                                    <Grid item xs={6} sm={4} md={3}><Typography>Giorni Lavorati: <strong>{riepilogoMese.giorniTotaliLavorati}</strong></Typography></Grid>
                                    <Grid item xs={6} sm={4} md={3}><Typography>Giorni Trasferta: <strong>{riepilogoMese.giorniTrasferta}</strong></Typography></Grid>
                                    <Grid item xs={12}><Typography variant="h6" sx={{mt: 1}}>Costo Totale: <strong>{riepilogoMese.costoTotale.toFixed(2)} €</strong></Typography></Grid>
                                </Grid>
                            </Paper>
                        ) : null}
                        
                        <Paper sx={{ flexGrow: 1, minHeight: 0 }}>
                            <DataGrid 
                                rows={rapportiniArricchiti} 
                                columns={columns} 
                                density="compact" 
                                rowHeight={42} 
                                loading={masterDataLoading}
                                initialState={{ sorting: { sortModel: [{ field: 'data', sort: 'asc' }] } }} 
                            />
                        </Paper>
                    </Box>
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
