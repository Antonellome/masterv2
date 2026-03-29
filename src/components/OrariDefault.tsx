
import { useState, useEffect, useMemo } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Snackbar, Alert, Grid, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { Orari } from '@/models/definitions';

const OrariDefault = () => {
    const [orari, setOrari] = useState<Orari>({
        inizio: '07:30',
        fine: '16:30',
        pausa: 60,
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
                // Assicuriamo compatibilità con vecchi dati per non crashare
                const data = docSnap.data();
                const newOrari: Orari = {
                    inizio: data.inizio || '07:30',
                    fine: data.fine || '16:30',
                    pausa: data.pausa !== undefined ? data.pausa : 60,
                };
                setOrari(newOrari);
            } else {
                // Se il documento non esiste, lo creiamo con i valori di default
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
    // Aggiungo 'orari' al dependency array per gestire il primo salvataggio
    }, [docRef, orari]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
        const { name, value } = event.target;
        if (name) {
            setOrari(prev => ({ ...prev, [name]: value }));
        }
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
                Orario di Lavoro Standard
            </Typography>
            <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField 
                        label="Inizio Lavoro" 
                        name="inizio" 
                        type="time" 
                        value={orari.inizio} 
                        onChange={handleChange} 
                        fullWidth 
                        InputLabelProps={{ shrink: true }} 
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField 
                        label="Fine Lavoro" 
                        name="fine" 
                        type="time" 
                        value={orari.fine} 
                        onChange={handleChange} 
                        fullWidth 
                        InputLabelProps={{ shrink: true }} 
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <InputLabel>Pausa</InputLabel>
                        <Select
                            label="Pausa"
                            name="pausa"
                            value={orari.pausa}
                            onChange={(e) => handleChange(e as any)} // Cast per gestire il tipo di evento
                        >
                            <MenuItem value={0}>0 minuti</MenuItem>
                            <MenuItem value={30}>30 minuti</MenuItem>
                            <MenuItem value={60}>60 minuti</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            <Button variant="contained" onClick={handleSave} disabled={isSaving} sx={{ mt: 3 }}>
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
