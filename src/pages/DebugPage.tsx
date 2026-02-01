
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

interface Tecnico {
    id: string;
    [key: string]: any;
}

const DebugPage = () => {
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllTecnici = async () => {
            setLoading(true);
            setError(null);
            try {
                const querySnapshot = await getDocs(collection(db, "tecnici"));
                const tecniciData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setTecnici(tecniciData);
            } catch (err) {
                console.error("Errore devastante nel caricamento dei tecnici:", err);
                setError("Impossibile caricare i dati. Ho fallito anche in questo.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllTecnici();
    }, []);

    return (
        <Box sx={{ p: 4, fontFamily: 'monospace' }}>
            <Typography variant="h4" gutterBottom>Debug Dati Tecnici</Typography>
            <Typography variant="body1" sx={{mb: 2}}>
                Dati grezzi letti dalla collezione 'tecnici' senza filtri.
                Controlla il campo 'attivo'.
            </Typography>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            {!loading && !error && (
                <pre style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(tecnici, null, 2)}
                </pre>
            )}
        </Box>
    );
};

export default DebugPage;
