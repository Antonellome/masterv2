
import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button, Box, CircularProgress, Typography, Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

// La funzione, come confermato dalla console di Firebase, è in us-central1.
// Questa è la configurazione corretta e definitiva.
const functions = getFunctions(undefined, 'us-central1');
const executeMigrationCallable = httpsCallable(functions, 'executeMigration');

const MigrationRunner = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openConfirm, setOpenConfirm] = useState(false);

    const handleOpenConfirm = () => {
        setResult(null);
        setError(null);
        setOpenConfirm(true);
    };

    const handleCloseConfirm = () => {
        setOpenConfirm(false);
    };

    const handleRunMigration = async () => {
        handleCloseConfirm();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await executeMigrationCallable({});
            const data = response.data as { success: boolean; rapportiniAggiornati: number; message: string };

            if (data.success) {
                const message = data.rapportiniAggiornati > 0 
                    ? `Migrazione completata con successo! ${data.rapportiniAggiornati} rapportini sono stati aggiornati.` 
                    : "Database già aggiornato. Nessuna modifica necessaria.";
                setResult({ success: true, message });
            } else {
                setError(data.message || "Si è verificato un errore sconosciuto durante la migrazione.");
            }

        } catch (err: any) {
            console.error("Errore grave durante l'esecuzione della migrazione:", err);
            console.error("Dettagli errore Firebase:", err.details);
            const errorMessage = err.message || "Errore sconosciuto. Controlla i log della Cloud Function per maggiori dettagli.";
            setError(`Errore grave durante l'esecuzione della migrazione: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 2, border: '1px dashed grey', borderRadius: 2, mt: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
                Strumento di Migrazione Dati
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Questo strumento aggiorna i vecchi rapportini alla nuova struttura dati. L'operazione è sicura e può essere eseguita più volte.
            </Typography>
            
            <Button 
                variant="contained"
                color="warning"
                onClick={handleOpenConfirm}
                disabled={loading}
            >
                {loading ? 'Esecuzione in corso...' : 'Avvia Migrazione Dati'}
            </Button>

            {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}

            {result && (
                <Alert severity={result.success ? 'success' : 'info'} sx={{ mt: 2 }}>
                    {result.message}
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            <Dialog open={openConfirm} onClose={handleCloseConfirm}>
                <DialogTitle>Conferma Migrazione Dati</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Stai per avviare il processo di aggiornamento dei rapportini. L'operazione potrebbe richiedere alcuni minuti.
                        <br/><br/>
                        Sei sicuro di voler procedere?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirm}>Annulla</Button>
                    <Button onClick={handleRunMigration} color="warning" variant="contained" autoFocus>
                        Conferma e Avvia
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MigrationRunner;
