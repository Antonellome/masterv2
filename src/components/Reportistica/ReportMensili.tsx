
import { useState, useMemo, useEffect } from 'react';
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
    Grid,
    LinearProgress,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DataGrid, GridColDef, GridFooterContainer, GridToolbar, GridRowParams } from '@mui/x-data-grid';
import { collection, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useData } from '@/hooks/useData';
import { Rapportino, Tecnico, Veicolo, Nave, Luogo, TipoGiornata } from '@/models/definitions';
import jsPDF from 'jspdf';
import { generateRapportinoPage } from '@/utils/pdfGenerator'; // Import the new utility function

dayjs.locale('it');

interface Presenza {
    id: string;
    data: string;
    tipoGiornata: string;
    nave: string;
    luogo: string;
    oreOrdinarie: number;
    oreStraordinarie: number;
    totaleOreGiorno: number;
}

interface Totali {
    oreOrdinarie: number;
    oreStraordinarie: number;
    totaleGenerale: number;
    perTipoGiornata: { [key: string]: { ore: number; giorni: number } };
}

const ConsuntivoMensile = () => {
    const navigate = useNavigate();
    const anagrafiche = useData();
    const { tecnici, veicoli, navi, luoghi, tipiGiornata, loading: anagraficheLoading, error: anagraficheError } = anagrafiche;
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [rapportiniLoading, setRapportiniLoading] = useState(true);
    const [rapportiniError, setRapportiniError] = useState<string | null>(null);
    
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs());
    const [reportGenerated, setReportGenerated] = useState(false);
    
    const [isExporting, setIsExporting] = useState(false);
    const [progressExport, setProgressExport] = useState(0);
    const [exportErrors, setExportErrors] = useState<string[]>([]);
    
    const SOGLIA_ORE_ORDINARIE = 8;

    useEffect(() => {
        setRapportiniLoading(true);
        const unsub = onSnapshot(collection(db, "rapportini"), 
            (snapshot) => {
                const rapportiniData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Rapportino));
                setRapportini(rapportiniData);
                setRapportiniLoading(false);
            }, 
            (err) => {
                console.error("Errore caricamento rapportini:", err);
                setRapportiniError("Errore nel caricamento dei rapportini.");
                setRapportiniLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const handleGenerateReport = () => {
        if (!selectedTecnico || !selectedMonth) {
            setRapportiniError("Per favore, seleziona un tecnico e un mese validi.");
            return;
        }
        setRapportiniError(null);
        setReportGenerated(true);
        setExportErrors([]); 
    };

    const handleRowClick = (params: GridRowParams) => {
        navigate(`/rapportino/edit/${params.id}`);
    };

    const handleExportAll = async () => {
        setIsExporting(true);
        setProgressExport(0);
        setExportErrors([]);
        const errors: string[] = [];

        if (anagraficheLoading) {
            setExportErrors(["Dati anagrafici non ancora caricati. Riprova tra un istante."]);
            setIsExporting(false);
            return;
        }

        const pdfDoc = new jsPDF();
        const filteredRapportiniIds = presenze.map(p => p.id);
        let pagesAdded = 0;

        for (let i = 0; i < filteredRapportiniIds.length; i++) {
            const rapportinoId = filteredRapportiniIds[i];
            
            try {
                const docRef = doc(db, 'rapportini', rapportinoId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    errors.push(`Rapportino ID ${rapportinoId} non trovato.`);
                    continue;
                }
                
                const rapportinoData = { id: docSnap.id, ...docSnap.data() } as Rapportino;

                if (!rapportinoData.data) {
                    errors.push(`Rapportino ${rapportinoId} non ha una data valida.`);
                    continue;
                }

                if (pagesAdded > 0) {
                    pdfDoc.addPage();
                }
                pagesAdded++;

                // Use the centralized utility function to generate the page content
                generateRapportinoPage(pdfDoc, rapportinoData, anagrafiche);

            } catch(e: any) {
                errors.push(`Errore imprevisto su ID ${rapportinoId}: ${e.message}`);
            }
            setProgressExport(((i + 1) / filteredRapportiniIds.length) * 100);
        }

        if (errors.length > 0) {
            setExportErrors(errors);
        }

        if (pagesAdded > 0) {
            pdfDoc.save(`report_mensili_${selectedTecnico?.cognome}_${selectedMonth?.format('MM-YYYY')}.pdf`);
        } else {
            setExportErrors(prev => [...prev, "Nessun rapportino valido è stato generato. Il PDF non è stato creato."]);
        }

        setIsExporting(false);
    };
    
    const presenze = useMemo((): Presenza[] => {
        if (!reportGenerated || !selectedTecnico || !selectedMonth) {
            return [];
        }

        const startOfMonth = selectedMonth.startOf('month');
        const endOfMonth = selectedMonth.endOf('month');

        const naviMap = new Map(navi.map(d => [d.id, d.nome]));
        const tipiGiornataMap = new Map(tipiGiornata.map(d => [d.id, d.nome]));
        const luoghiMap = new Map(luoghi.map(d => [d.id, d.nome]));
        
        const filteredRapportini = rapportini.filter(r => {
            const dataRapportino = r.data instanceof Timestamp ? dayjs(r.data.toDate()) : null;
            if (!dataRapportino) return false;
            
            const presenzeTecnico = r.presenze || [];
            const isTecnicoPresente = presenzeTecnico.includes(selectedTecnico.id);
            const isNelMese = dataRapportino.isAfter(startOfMonth.subtract(1, 'day')) && dataRapportino.isBefore(endOfMonth.add(1, 'day'));
            
            return isTecnicoPresente && isNelMese;
        });

        const presenzeData = filteredRapportini.map(r => {
            const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === selectedTecnico.id);
            const oreLavoro = dettaglioTecnico ? dettaglioTecnico.ore : (r.oreLavoro || 0);

            const oreOrdinarie = Math.min(oreLavoro, SOGLIA_ORE_ORDINARIE);
            const oreStraordinarie = Math.max(0, oreLavoro - SOGLIA_ORE_ORDINARIE);
            
            const formattedDate = r.data instanceof Timestamp ? dayjs(r.data.toDate()).format('DD/MM/YYYY') : 'Data Invalida';

            return {
                id: r.id,
                data: formattedDate,
                tipoGiornata: r.tipoGiornataId ? tipiGiornataMap.get(r.tipoGiornataId) || 'N/D' : 'N/D',
                nave: r.naveId ? naviMap.get(r.naveId) || 'N/D' : 'N/D',
                luogo: r.luogoId ? luoghiMap.get(r.luogoId) || 'N/D' : 'N/D',
                oreOrdinarie,
                oreStraordinarie,
                totaleOreGiorno: oreLavoro,
            } as Presenza;
        });
        
        presenzeData.sort((a, b) => dayjs(a.data, 'DD/MM/YYYY').diff(dayjs(b.data, 'DD/MM/YYYY')));
        
        return presenzeData;

    }, [rapportini, selectedTecnico, selectedMonth, reportGenerated, navi, tipiGiornata, luoghi]);


    const columns: GridColDef[] = [
        { field: 'data', headerName: 'Data', width: 120, sortable: true },
        { field: 'tipoGiornata', headerName: 'Tipo Giornata', flex: 1 },
        { field: 'nave', headerName: 'Nave', flex: 1 },
        { field: 'luogo', headerName: 'Luogo', flex: 1 },
        { field: 'oreOrdinarie', headerName: 'Ordinarie', width: 100, type: 'number' },
        { field: 'oreStraordinarie', headerName: 'Straordinarie', width: 110, type: 'number' },
        { field: 'totaleOreGiorno', headerName: 'Totale Giorno', width: 120, type: 'number' },
    ];

    const totali: Totali = useMemo(() => {
        return presenze.reduce((acc, curr) => {
            const tipoGiornata = curr.tipoGiornata || "Non specificato";
            
            acc.oreOrdinarie += curr.oreOrdinarie;
            acc.oreStraordinarie += curr.oreStraordinarie;
            acc.totaleGenerale += curr.totaleOreGiorno;
            
            if (!acc.perTipoGiornata[tipoGiornata]) {
                acc.perTipoGiornata[tipoGiornata] = { ore: 0, giorni: 0 };
            }
            
            acc.perTipoGiornata[tipoGiornata].ore += curr.totaleOreGiorno;
            acc.perTipoGiornata[tipoGiornata].giorni += 1;
            
            return acc;
        }, { 
            oreOrdinarie: 0, 
            oreStraordinarie: 0, 
            totaleGenerale: 0, 
            perTipoGiornata: {} 
        } as Totali);
    }, [presenze]);

    const CustomFooter = () => (
         <GridFooterContainer sx={{ justifyContent: 'space-between', p: 3, borderTop: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
            <Box sx={{ mb: { xs: 3, md: 0 }, flex: '1 1 50%' }}>
                <Typography variant="h6" gutterBottom>Riepilogo per Tipo Giornata</Typography>
                <Grid container spacing={1}>
                    {Object.entries(totali.perTipoGiornata).map(([tipo, { ore, giorni }]) => (
                        <Grid item xs={12} sm={6} md={12} key={tipo}>
                            <Typography variant="body2">
                                <strong>{tipo}:</strong> {ore} ore ({giorni} {giorni > 1 ? 'giorni' : 'giorno'})
                            </Typography>
                        </Grid>
                    ))}
                </Grid>
            </Box>
            <Box sx={{ textAlign: { md: 'right' }, flex: '1 1 40%' }}>
                <Typography variant="h6" gutterBottom>Riepilogo Totale Mensile</Typography>
                <Typography variant="body1">Ore Ordinarie: <strong>{totali.oreOrdinarie}</strong></Typography>
                <Typography variant="body1">Ore Straordinarie: <strong>{totali.oreStraordinarie}</strong></Typography>
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #ccc' }}>
                    <Typography variant="h5">Totale Generale: {totali.totaleGenerale} ore</Typography>
                </Box>
            </Box>
        </GridFooterContainer>
    );
    
    const loading = anagraficheLoading || rapportiniLoading;
    const error = anagraficheError || rapportiniError;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Paper sx={{ p: 3, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 2, flexShrink: 0 }}>
                     <Grid item xs={12} sm={6} md={4}>
                        <Autocomplete
                            options={tecnici.sort((a, b) => a.cognome.localeCompare(b.cognome))}
                            getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                            value={selectedTecnico}
                            onChange={(_, newValue) => setSelectedTecnico(newValue)}
                            renderInput={(params) => <TextField {...params} label="Seleziona Tecnico" fullWidth />}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                    </Grid>
                     <Grid item xs={12} sm={6} md={3}>
                        <DatePicker
                            label="Seleziona Mese"
                            views={['month', 'year']}
                            value={selectedMonth}
                            onChange={setSelectedMonth}
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
                            onClick={handleExportAll} 
                            disabled={!reportGenerated || isExporting || presenze.length === 0}
                            fullWidth
                            size="large"
                        >
                            {isExporting ? <CircularProgress size={24} /> : 'Esporta PDF'}
                        </Button>
                    </Grid>
                </Grid>

                {isExporting && (
                    <Box sx={{ width: '100%', my: 2 }}>
                        <Typography variant="caption" display="block" align="center">Creazione PDF in corso...</Typography>
                        <LinearProgress variant="determinate" value={progressExport} />
                    </Box>
                )}

                {exportErrors.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>Rapporto di esportazione</Typography>
                        <List dense>
                            {exportErrors.map((err, index) => (
                                <ListItem key={index}>
                                    <ListItemText primary={`- ${err}`} />
                                </ListItem>
                            ))}
                        </List>
                    </Alert>
                )}

                {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}

                {(reportGenerated && !loading) && (
                    <Box sx={{ flexGrow: 1, width: '100%', mt: 2 }}>
                         <DataGrid
                            rows={presenze}
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
                 {loading && !reportGenerated && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5, flexDirection: 'column', alignItems: 'center' }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Caricamento dati...</Typography>
                    </Box>
                )}
            </Paper>
        </LocalizationProvider>
    );
};

export default ConsuntivoMensile;
