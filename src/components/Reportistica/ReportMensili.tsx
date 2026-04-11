
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
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { RapportinoSchema } from '@/models/rapportino.schema';

dayjs.locale('it');

// --- Definizioni dei tipi ---
interface Tecnico {
    id: string;
    nome: string;
    cognome: string;
}

interface Nave {
    id: string;
    nome?: string;
}

interface Luogo {
    id: string;
    nome?: string;
}

interface TipoGiornata {
    id: string;
    nome?: string;
}

interface Presenza {
    id: string;
    data: string;
    tipoGiornata: string;
    nave: string;
    luogo: string;
    ore: number;
}

interface Totali {
    [key: string]: number;
}

// --- Componente Principale ---
const ConsuntivoMensile = () => {
    // --- Stati del componente ---
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs());
    const [presenze, setPresenze] = useState<Presenza[]>([]);
    const [loading, setLoading] = useState(false);
    const [reportGenerated, setReportGenerated] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTecnici = async () => {
            try {
                const q = query(collection(db, "tecnici"));
                const querySnapshot = await getDocs(q);
                const tecniciList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tecnico));
                setTecnici(tecniciList.sort((a, b) => a.cognome.localeCompare(b.cognome)));
            } catch {
                setError("Errore nel caricamento dei tecnici.");
            }
        };
        fetchTecnici();
    }, []);

    const handleGenerateReport = async () => {
        if (!selectedTecnico || !selectedMonth) {
            setError("Per favore, seleziona un tecnico e un mese validi.");
            return;
        }

        setLoading(true);
        setError(null);
        setReportGenerated(false);

        try {
            const startOfMonth = selectedMonth.startOf('month').toDate();
            const endOfMonth = selectedMonth.endOf('month').toDate();

            // 1. Carica TUTTE le risorse necessarie per il lookup, inclusi i luoghi
            const [naviSnap, tipiGiornataSnap, luoghiSnap] = await Promise.all([
                getDocs(collection(db, "navi")),
                getDocs(collection(db, "tipiGiornata")),
                getDocs(collection(db, "luoghi")),
            ]);

            // 2. Crea le mappe per la traduzione, inclusa quella per i luoghi
            const naviMap = new Map(naviSnap.docs.map(doc => [doc.id, doc.data().nome]));
            const tipiGiornataMap = new Map(tipiGiornataSnap.docs.map(doc => [doc.id, doc.data().nome]));
            const luoghiMap = new Map(luoghiSnap.docs.map(doc => [doc.id, doc.data().nome]));

            const rapportiniQuery = query(
                collection(db, "rapportini"), 
                where("tecnicoScriventeId", "==", selectedTecnico.id),
                where("data", ">=", Timestamp.fromDate(startOfMonth)),
                where("data", "<=", Timestamp.fromDate(endOfMonth))
            );

            const querySnapshot = await getDocs(rapportiniQuery);
            if (querySnapshot.empty) {
                 setPresenze([]);
                 setReportGenerated(true);
                 setLoading(false);
                 return;
            }
            
            // 3. Mappa i risultati usando la logica corretta con `luogoId`
            const presenzeData = querySnapshot.docs.map(doc => {
                const data = doc.data() as RapportinoSchema;
                const formattedDate = data.data instanceof Timestamp ? dayjs(data.data.toDate()).format('DD/MM/YYYY') : 'Data Invalida';

                return {
                    id: doc.id,
                    data: formattedDate,
                    tipoGiornata: data.giornataId ? tipiGiornataMap.get(data.giornataId) || 'ID Giornata non trovato' : 'N/D',
                    nave: data.naveId ? naviMap.get(data.naveId) || 'ID Nave non trovato' : 'N/D',
                    luogo: data.luogoId ? luoghiMap.get(data.luogoId) || 'ID Luogo non trovato' : 'N/D',
                    ore: data.oreLavorate || 0,
                } as Presenza;
            });

            const validPresenze = presenzeData.filter(p => p.data !== 'Data Invalida');
            validPresenze.sort((a, b) => dayjs(a.data, 'DD/MM/YYYY').diff(dayjs(b.data, 'DD/MM/YYYY')));
            
            setPresenze(validPresenze);
            setReportGenerated(true);

        } catch (err: any) {
            console.error("Errore durante la generazione del report:", err);
            if (err.code === 'failed-precondition') {
                setError(`La query richiede un indice. Controlla la console per il link per crearlo.`);
            } else {
                setError("Si è verificato un errore imprevisto durante la generazione del report.");
            }
        }
        setLoading(false);
    };

    const columns: GridColDef[] = [
        { field: 'data', headerName: 'Data', width: 120, sortable: true },
        { field: 'tipoGiornata', headerName: 'Tipo Giornata', flex: 1 },
        { field: 'nave', headerName: 'Nave', flex: 1 },
        { field: 'luogo', headerName: 'Luogo', flex: 1 },
        { field: 'ore', headerName: 'Ore', width: 100, type: 'number' },
    ];

    const totaliPerTipoGiornata: Totali = useMemo(() => presenze.reduce((acc, curr) => {
        const key = curr.tipoGiornata || "Non specificato";
        acc[key] = (acc[key] || 0) + (curr.ore || 0);
        return acc;
    }, {} as Totali), [presenze]);

    const totaleGenerale = useMemo(() => presenze.reduce((acc, curr) => acc + (curr.ore || 0), 0), [presenze]);

    const CustomFooter = () => (
         <GridFooterContainer sx={{ justifyContent: 'flex-start', p: 2, borderTop: '1px solid #e0e0e0' }}>
            <Box>
                 <Typography variant="h6" gutterBottom>Riepilogo Ore</Typography>
                 <Grid container spacing={2}>
                    {Object.entries(totaliPerTipoGiornata).map(([tipo, ore]) => (
                        <Grid item xs={6} sm={4} md={3} key={tipo}>
                            <Typography variant="body2"><strong>{tipo}:</strong> {ore} ore</Typography>
                        </Grid>
                    ))}
                 </Grid>
                 <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ccc' }}>
                    <Typography variant="h5">Totale Generale: {totaleGenerale} ore</Typography>
                </Box>
            </Box>
        </GridFooterContainer>
    );

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Paper sx={{ p: 3, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 3, flexShrink: 0 }}>
                     <Grid item xs={12} sm={6} md={4}>
                        <Autocomplete
                            options={tecnici}
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

                {reportGenerated && (
                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                         <DataGrid
                            rows={presenze}
                            columns={columns}
                            slots={{ toolbar: GridToolbar, footer: CustomFooter }}
                            density="compact"
                            disableRowSelectionOnClick
                            localeText={{ noRowsLabel: "Nessun rapportino trovato per questo mese." }}
                        />
                    </Box>
                )}
            </Paper>
        </LocalizationProvider>
    );
};

export default ConsuntivoMensile;
