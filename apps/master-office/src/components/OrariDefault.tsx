import { useState, useEffect, useMemo } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Snackbar, Alert, Grid } from '@mui/material';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { Orari } from '@/models/definitions';

const OrariDefault = () => {
    const [orari, setOrari] = useState<Orari>({
        inizioMattina: '08:00',
        fineMattina: '12:00',
        inizioPomeriggio: '13:00',
        finePomeriggio: '17:00'
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const db = getFirestore();
    const docRef = useMemo(() => doc(db, 'configurazione', 'orariDefault'), [db]);

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setOrari(docSnap.data() as Orari);
            } else {
                setDoc(docRef, orari).catch(e => {
                    console.error("Errore nella creazione degli orari predefiniti: ", e);
                    setError("Impossibile creare le impostazioni predefinite.");
                });
            }
            setLoading(false);
        }, (err) => {
            console.error("Errore nel caricamento degli orari: ", err);
            setError("Impossibile caricare gli orari.");
            setLoading(false);
        });
    
        return () => unsubscribe();
    }, [docRef, orari]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setOrari(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(docRef, orari, { merge: true });
            setSnackbarOpen(true);
        } catch (error) {
            console.error("Errore nel salvataggio degli orari: ", error);
            setError("Errore durante il salvataggio.");
        }
        setIsSaving(false);
    };

    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box>
            <Typography variant='h6' gutterBottom>
                Orari di Lavoro Standard
            </Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid
                    size={{
                        xs: 6,
                        sm: 3
                    }}>
                    <TextField label="Inizio Mattina" name="inizioMattina" type="time" value={orari.inizioMattina} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid
                    size={{
                        xs: 6,
                        sm: 3
                    }}>
                    <TextField label="Fine Mattina" name="fineMattina" type="time" value={orari.fineMattina} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid
                    size={{
                        xs: 6,
                        sm: 3
                    }}>
                    <TextField label="Inizio Pomeriggio" name="inizioPomeriggio" type="time" value={orari.inizioPomeriggio} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid
                    size={{
                        xs: 6,
                        sm: 3
                    }}>
                    <TextField label="Fine Pomeriggio" name="finePomeriggio" type="time" value={orari.finePomeriggio} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
            </Grid>
            <Button variant="contained" onClick={handleSave} disabled={isSaving} sx={{ mt: 2 }}>
                {isSaving ? <CircularProgress size={24} /> : 'Salva Orari'}
            </Button>
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
                <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
                    Orari salvati con successo!
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default OrariDefault;
