
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { Button, Box, CircularProgress, Typography, Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar } from '@mui/material';

// Riferimento alle Cloud Functions
const runMigrationCallable = httpsCallable(functions, 'executeMigration');
const forceAdminCallable = httpsCallable(functions, 'forceAdmin');

const MigrationRunner = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    useEffect(() => {
        const synchronizePermissions = async () => {
            setSyncing(true);
            setSyncMessage("Sincronizzazione permessi in corso...");
            try {
                await forceAdminCallable();
                setSyncMessage("Permessi di amministratore sincronizzati con successo.");
            } catch (err) {
                console.error("Errore durante la sincronizzazione dei permessi:", err);
                setSyncMessage("Errore durante la sincronizzazione dei permessi.");
            }
            setTimeout(() => {
                setSyncing(false);
                setSyncMessage(null);
            }, 3000); // Nasconde il messaggio dopo 3 secondi
        };

        synchronizePermissions();
    }, []);

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
            const response = await runMigrationCallable({});
            const data = response.data as { success: boolean; message: string; createdCount: number };

            if (data.success) {
                setResult({ success: true, message: data.message });
            } else {
                setError(data.message || "Si è verificato un errore sconosciuto durante la migrazione.");
            }

        } catch (err: any) {
            console.error("Errore grave durante l'esecuzione della migrazione:", err);
            const errorMessage = err.message || "Errore sconosciuto. Controlla i log della Cloud Function per maggiori dettagli.";
            setError(`Errore durante l'esecuzione della migrazione: ${errorMessage}`);
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
                Questo strumento serve per sanare la base di dati, creando i profili mancanti per i tecnici che esistono nel sistema di autenticazione ma non in anagrafica (tecnici "fantasma").
            </Typography>
            
            <Button 
                variant="contained"
                color="warning"
                onClick={handleOpenConfirm}
                disabled={loading || syncing}
            >
                {loading ? 'Esecuzione in corso...' : 'Avvia Migrazione Tecnici Fantasma'}
            </Button>

            {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}

            {result && (
                <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                    {result.message}
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            <Dialog
                open={openConfirm}
                onClose={handleCloseConfirm}
            >
                <DialogTitle>Conferma Migrazione</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Stai per avviare il processo di migrazione dei "tecnici fantasma". Questa operazione non modifica o elimina dati esistenti, ma aggiunge solo i profili mancanti.
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

            <Snackbar
                open={syncing}
                message={syncMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            />
        </Box>
    );
};

export default MigrationRunner;
