
import { useState, useMemo, useEffect } from 'react';
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
import { DataGrid, GridColDef, GridFooterContainer, GridToolbar } from '@mui/x-data-grid';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useData } from '@/hooks/useData';
import { Rapportino, Tecnico } from '@/models/definitions';

dayjs.locale('it');

// --- Definizioni dei tipi ---
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

// --- Componente Principale ---
const ConsuntivoMensile = () => {
    // --- Stati del componente ---
    const { tecnici, navi, tipiGiornata, luoghi, loading: anagraficheLoading, error: anagraficheError } = useData();
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [rapportiniLoading, setRapportiniLoading] = useState(true);
    const [rapportiniError, setRapportiniError] = useState<string | null>(null);
    
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs());
    const [reportGenerated, setReportGenerated] = useState(false);
    
    const SOGLIA_ORE_ORDINARIE = 8;

    useEffect(() => {
        setRapportiniLoading(true);
        const unsub = onSnapshot(collection(db, "rapportini"), 
            (snapshot) => {
                const rapportiniData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
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
    };
    
    const presenze = useMemo((): Presenza[] => {
        if (!reportGenerated || !selectedTecnico || !selectedMonth) {
            return [];
        }

        const startOfMonth = selectedMonth.startOf('month');
        const endOfMonth = selectedMonth.endOf('month');

        const naviMap = new Map(navi.map(doc => [doc.id, doc.nome]));
        const tipiGiornataMap = new Map(tipiGiornata.map(doc => [doc.id, doc.nome]));
        const luoghiMap = new Map(luoghi.map(doc => [doc.id, doc.nome]));
        
        const filteredRapportini = rapportini.filter(r => {
            const dataRapportino = r.data instanceof Timestamp ? dayjs(r.data.toDate()) : null;
            if (!dataRapportino) return false;
            
            const presenzeTecnico = r.presenze || [];
            const isTecnicoPresente = presenzeTecnico.includes(selectedTecnico.id);
            const isNelMese = dataRapportino.isAfter(startOfMonth.subtract(1, 'day')) && dataRapportino.isBefore(endOfMonth.add(1, 'day'));
            
            return isTecnicoPresente && isNelMese;
        });

        const presenzeData = filteredRapportini.map(doc => {
            const oreLavoro = doc.oreLavoro || 0;
            const oreOrdinarie = Math.min(oreLavoro, SOGLIA_ORE_ORDINARIE);
            const oreStraordinarie = Math.max(0, oreLavoro - SOGLIA_ORE_ORDINARIE);
            
            const formattedDate = doc.data instanceof Timestamp ? dayjs(doc.data.toDate()).format('DD/MM/YYYY') : 'Data Invalida';

            return {
                id: doc.id,
                data: formattedDate,
                tipoGiornata: doc.tipoGiornataId ? tipiGiornataMap.get(doc.tipoGiornataId) || 'N/D' : 'N/D',
                nave: doc.naveId ? naviMap.get(doc.naveId) || 'N/D' : 'N/D',
                luogo: doc.luogoId ? luoghiMap.get(doc.luogoId) || 'N/D' : 'N/D',
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
                <Grid container spacing={2} alignItems="center" sx={{ mb: 3, flexShrink: 0 }}>
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
                     <Grid item xs={12} sm={6} md={4}>
                        <DatePicker
                            label="Seleziona Mese"
                            views={['month', 'year']}
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    </Grid>
                     <Grid item xs={12} md={4}>
                        <Button 
                            variant="contained" 
                            onClick={handleGenerateReport} 
                            disabled={loading || !selectedTecnico || !selectedMonth}
                            fullWidth
                            size="large"
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Genera Report'}
                        </Button>
                    </Grid>
                </Grid>

                {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}

                {(reportGenerated && !loading) && (
                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                         <DataGrid
                            rows={presenze}
                            columns={columns}
                            slots={{ toolbar: GridToolbar, footer: CustomFooter }}
                            density="compact"
                            disableRowSelectionOnClick
                            localeText={{ noRowsLabel: "Nessun rapportino trovato per il tecnico e il mese selezionati." }}
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
