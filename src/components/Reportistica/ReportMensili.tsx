import { useState, useMemo, useCallback, useEffect } from 'react';
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

// Imposta la lingua di dayjs a italiano
dayjs.locale('it');

interface Tecnico {
    id: string;
    nome: string;
    cognome: string;
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

const ConsuntivoMensile = () => {
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
            } catch (err) {
                setError("Errore nel caricamento dei tecnici.");
            }
        };
        fetchTecnici();
    }, []);

    const handleGenerateReport = useCallback(async () => {
        if (!selectedTecnico || !selectedMonth) {
            setError("Per favore, seleziona un tecnico e un mese validi.");
            return;
        }

        setLoading(true);
        setError(null);
        setReportGenerated(false);

        try {
            const startOfMonth = selectedMonth.startOf('month');
            const endOfMonth = selectedMonth.endOf('month');

            const rapportiniQuery = query(
                collection(db, "rapportini"), 
                where("tecnicoScriventeId", "==", selectedTecnico.id),
                where("data", ">=", Timestamp.fromDate(startOfMonth.toDate())),
                where("data", "<=", Timestamp.fromDate(endOfMonth.toDate()))
            );

            const querySnapshot = await getDocs(rapportiniQuery);
            const presenzeData = querySnapshot.docs.map(doc => {
                const data = doc.data();

                // --- CORREZIONE FINALE: CODICE PARANOICO ---
                // Aggiungo un fallback per OGNI campo per prevenire crash.
                const formattedDate = (data.data && typeof data.data.toDate === 'function')
                    ? dayjs(data.data.toDate()).format('DD/MM/YYYY')
                    : 'Data Invalida';

                return {
                    id: doc.id,
                    data: formattedDate,
                    tipoGiornata: data.tipoGiornata || 'N/D',
                    nave: data.nave || 'N/D',
                    luogo: data.luogo || 'N/D',
                    ore: data.ore || 0,
                } as Presenza;
            });
            
            // Filtro via le date invalide prima di ordinarle per evitare crash
            const validPresenze = presenzeData.filter(p => p.data !== 'Data Invalida');
            const invalidPresenze = presenzeData.filter(p => p.data === 'Data Invalida');

            validPresenze.sort((a, b) => dayjs(a.data, 'DD/MM/YYYY').diff(dayjs(b.data, 'DD/MM/YYYY')));

            setPresenze([...validPresenze, ...invalidPresenze]);
            setReportGenerated(true);
        } catch (err) {
            console.error("ERRORE DOPO LA CORREZIONE FINALE:", err);
            setError("Si è verificato un errore imprevisto. Controlla la console per i dettagli.");
        }
        setLoading(false);
    }, [selectedTecnico, selectedMonth]);

    const columns: GridColDef[] = [
        { field: 'data', headerName: 'Data', width: 120, sortable: true },
        { field: 'tipoGiornata', headerName: 'Tipo Giornata', width: 180 },
        { field: 'nave', headerName: 'Nave', width: 200 },
        { field: 'luogo', headerName: 'Luogo', width: 200 },
        { field: 'ore', headerName: 'Ore', width: 100, type: 'number' },
    ];

    const totaliPerTipoGiornata: Totali = useMemo(() => {
        return presenze.reduce((acc, curr) => {
            // Il fallback (curr.ore || 0) previene errori qui
            acc[curr.tipoGiornata] = (acc[curr.tipoGiornata] || 0) + curr.ore;
            return acc;
        }, {} as Totali);
    }, [presenze]);

    const totaleGenerale = useMemo(() => {
         // Il fallback (curr.ore || 0) previene errori qui
        return presenze.reduce((acc, curr) => acc + curr.ore, 0);
    }, [presenze]);

    
    const CustomFooter = () => (
         <GridFooterContainer>
            <Box sx={{ p: 2, width: '100%' }}>
                 <Typography variant="h6" gutterBottom>Riepilogo Ore</Typography>
                 <Grid container spacing={2}>
                    {Object.entries(totaliPerTipoGiornata).map(([tipo, ore]) => (
                        <Grid
                            item
                            key={tipo}
                            xs={6}
                            sm={4}
                            md={3}>
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
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 3, flexShrink: 0 }}>
                    <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}>
                        <Autocomplete
                            options={tecnici}
                            getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                            value={selectedTecnico}
                            onChange={(event, newValue) => setSelectedTecnico(newValue)}
                            renderInput={(params) => <TextField {...params} label="Seleziona Tecnico" fullWidth />}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                    </Grid>
                    <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}>
                        <DatePicker
                            label="Seleziona Mese"
                            views={['month', 'year']}
                            value={selectedMonth}
                            onChange={(newValue) => setSelectedMonth(newValue)}
                        />
                    </Grid>
                    <Grid
                        item
                        xs={12}
                        md={4}>
                        <Button 
                            variant="contained" 
                            onClick={handleGenerateReport} 
                            disabled={loading || !selectedTecnico || !selectedMonth}
                            fullWidth
                        >
                            {loading ? <CircularProgress size={24} /> : 'Genera Report'}
                        </Button>
                    </Grid>
                </Grid>

                {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}

                {reportGenerated && (
                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                         <DataGrid
                            rows={presenze || []}
                            columns={columns}
                            slots={{
                                toolbar: GridToolbar,
                                footer: CustomFooter,
                            }}
                            density="compact"
                            disableRowSelectionOnClick
                            localeText={{
                                toolbarDensity: 'Densità',
                                toolbarFilters: 'Filtri',
                                toolbarColumns: 'Colonne',
                                toolbarExport: 'Esporta',
                            }}
                        />
                    </Box>
                )}
            </Paper>
        </LocalizationProvider>
    );
};

export default ConsuntivoMensile;
