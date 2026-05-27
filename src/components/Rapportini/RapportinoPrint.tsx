
import { useEffect, useState, memo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Rapportino, Tecnico, Veicolo, Nave, Luogo, TipoGiornata } from '@/models/definitions';
import { Box, Typography, Paper, Grid, Divider, CircularProgress, Alert } from '@mui/material';
import { useData } from '@/hooks/useData';
import dayjs from 'dayjs';

interface RapportinoPrintProps {
    rapportinoId: string;
    onReady?: () => void; // Callback to signal data is ready AND rendered
}

const RapportinoPrint = memo(({ rapportinoId, onReady }: RapportinoPrintProps) => {
    const [rapportino, setRapportino] = useState<Rapportino | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { tecnici, veicoli, navi, luoghi, tipiGiornata } = useData();

    // Step 1: Fetch data when ID changes
    useEffect(() => {
        const fetchRapportino = async () => {
            if (!rapportinoId) {
                setRapportino(null);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const docRef = doc(db, 'rapportini', rapportinoId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setRapportino({ id: docSnap.id, ...docSnap.data() } as Rapportino);
                } else {
                    setError('Rapportino non trovato.');
                    setRapportino(null);
                }
            } catch (err) {
                setError('Errore nel caricamento del rapportino.');
                setRapportino(null);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchRapportino();
    }, [rapportinoId]);

    // Step 2: After the component has re-rendered with new data, signal readiness *after paint*
    useEffect(() => {
        if (!loading && onReady) {
            // This is the key: we wait for the browser to paint the new content
            // before we tell the parent component that we are ready to be captured.
            requestAnimationFrame(() => {
                if (onReady) {
                    onReady();
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, rapportino]); // Dependencies ensure this runs after data is loaded and state is set

    const getNome = (collection: (Tecnico | Veicolo | Nave | Luogo | TipoGiornata)[], id: string | undefined) => {
        if (!id) return 'N/D';
        const item = collection.find(t => t.id === id);
        if (!item) return 'N/D';
        // @ts-ignore
        if ('cognome' in item && 'nome' in item) return `${item.cognome} ${item.nome}`.trim();
        // @ts-ignore
        if ('targa' in item && 'nome' in item) return `${item.targa} - ${item.nome}`.trim();
        // @ts-ignore
        return item.nome;
    };

    if (loading) return <Box sx={{ p: 4, width: '210mm', height: '297mm', boxSizing: 'border-box', textAlign: 'center' }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ p: 4, width: '210mm', height: '297mm', boxSizing: 'border-box' }}><Alert severity="error">{error}</Alert></Box>;
    if (!rapportino) return <Box sx={{ width: '210mm', height: '297mm', boxSizing: 'border-box' }} />; // Render an empty space of the correct size

    const dataRapportino = rapportino.data ? dayjs(rapportino.data.toDate()).format('DD/MM/YYYY') : 'N/D';
    const tipoGiornataNome = getNome(tipiGiornata, rapportino.giornataId);
    const responsabile = getNome(tecnici, rapportino.tecnicoId);

    return (
        <Paper sx={{ p: 4, width: '210mm', minHeight: '297mm', boxSizing: 'border-box', pageBreakAfter: 'always', backgroundColor: 'white' }} elevation={0} square>
            <Typography variant="h4" gutterBottom align="center">Rapportino di Intervento</Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
                <Grid item xs={6}><Typography><strong>Data:</strong> {dataRapportino}</Typography></Grid>
                <Grid item xs={6}><Typography><strong>Tipo Giornata:</strong> {tipoGiornataNome}</Typography></Grid>
                <Grid item xs={12}><Typography><strong>Tecnico Responsabile:</strong> {responsabile}</Typography></Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>Dettagli Intervento</Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={12}><Typography><strong>Nave:</strong> {getNome(navi, rapportino.naveId)}</Typography></Grid>
                <Grid item xs={12}><Typography><strong>Luogo:</strong> {getNome(luoghi, rapportino.luogoId)}</Typography></Grid>
                <Grid item xs={12}><Typography><strong>Veicolo:</strong> {getNome(veicoli, rapportino.veicoloId)}</Typography></Grid>
                <Grid item xs={12}><Typography><strong>Descrizione Breve:</strong> {rapportino.descrizioneBreve || 'Nessuna'}</Typography></Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>Lavoro Eseguito</Typography>
            <Typography paragraph sx={{ border: '1px solid #eee', p: 1, minHeight: 80, whiteSpace: 'pre-wrap' }}>{rapportino.lavoroEseguito || 'Nessuno'}</Typography>

            <Typography variant="h6" gutterBottom>Materiali Impiegati</Typography>
            <Typography paragraph sx={{ border: '1px solid #eee', p: 1, minHeight: 80, whiteSpace: 'pre-wrap' }}>{rapportino.materialiImpiegati || 'Nessuno'}</Typography>
            
            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>Dettaglio Ore Lavoro</Typography>
            <Grid container spacing={1}>
                 {rapportino.dettaglioOreTecnici?.map(dettaglio => (
                    <Grid item xs={12} key={dettaglio.tecnicoId}>
                        <Typography>
                            <strong>{getNome(tecnici, dettaglio.tecnicoId)}:</strong> {dettaglio.ore || 0} ore
                        </Typography>
                    </Grid>
                 ))}
                 <Grid item xs={12} sx={{mt: 1}}>
                    <Typography variant="h6"><strong>Totale Ore Lavoro: {rapportino.oreLavoro || 0}</strong></Typography>
                 </Grid>
            </Grid>
        </Paper>
    );
});

export default RapportinoPrint;
