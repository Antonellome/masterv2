import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';

const GestioneNaviDebug: React.FC = () => {
    const { clienti, loading: clientiLoading } = useData();
    const [navi, setNavi] = useState<any[]>([]);
    const [naviLoading, setNaviLoading] = useState(true);

    useEffect(() => {
        const fetchNavi = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'navi'));
                const naviData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setNavi(naviData);
            } catch (error) {
                console.error("Errore caricamento navi per debug:", error);
            } finally {
                setNaviLoading(false);
            }
        };

        fetchNavi();
    }, []);

    const loading = clientiLoading || naviLoading;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Caricamento dati per diagnosi...</Typography>
            </Box>
        );
    }

    return (
        <Paper sx={{ p: 2, m: 2, backgroundColor: '#252526', color: '#d4d4d4', fontFamily: 'monospace', height: '90vh', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>Diagnostica Dati Grezzi</Typography>
            
            <Box sx={{ my: 2, p: 2, border: '1px dashed grey' }}>
                <Typography variant="subtitle1" sx={{ textDecoration: 'underline' }}>CLIENTI (Dati globali dal contesto)</Typography>
                <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{JSON.stringify(clienti, null, 2)}</pre>
            </Box>

            <Box sx={{ my: 2, p: 2, border: '1px dashed grey' }}>
                <Typography variant="subtitle1" sx={{ textDecoration: 'underline' }}>NAVI (Dati caricati localmente)</Typography>
                <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{JSON.stringify(navi, null, 2)}</pre>
            </Box>

            <Box sx={{ mt: 4, p: 2, backgroundColor: '#333'}}>
                <Typography variant="subtitle2">ISTRUZIONI:</Typography>
                <Typography variant="body2" sx={{mt: 1}}>
                    1. La lista `CLIENTI` qui sopra è vuota (`[]`)? Se sì, abbiamo trovato il problema.
                </Typography>
                 <Typography variant="body2" sx={{mt: 1}}>
                    2. Se non è vuota, prendi un `clienteId` da una delle `NAVI` e controlla se esiste un cliente con lo stesso `id` nella lista `CLIENTI`.
                </Typography>
            </Box>
        </Paper>
    );
};

export default GestioneNaviDebug;
