
import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button, Box, CircularProgress, Typography, Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

// --- CORREZIONE REGIONE E NOME FUNZIONE ---
// La funzione si trova in `europe-west1` come da screenshot.
const functions = getFunctions(undefined, 'europe-west1');
// Il nome corretto della funzione è `migraStaffUnaTantum`.
const migrationCallable = httpsCallable(functions, 'migraStaffUnaTantum');

const MigrationRunner = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ status: string; message: string; } | null>(null);
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
            const response = await migrationCallable({});
            const data = response.data as { status: string; message: string };

            if (data.status === 'success' || data.status === 'warning') {
                setResult(data);
            } else {
                setError(data.message || "Si è verificato un errore sconosciuto durante la migrazione.");
            }

        } catch (err: any) {
            console.error("Errore grave durante l'esecuzione della migrazione:", err);
            const errorMessage = err.details?.message || err.message || "Errore sconosciuto. Controlla i log della Cloud Function per maggiori dettagli.";
            setError(`Errore grave durante l'esecuzione della migrazione: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 2, border: '1px dashed grey', borderRadius: 2, mt: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
                Strumento di Migrazione Utenti Staff
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Questo strumento serve a migrare gli utenti dalla vecchia collezione 'utenti_master' al nuovo sistema di Custom Claims (livello: 'staff'). VA ESEGUITO UNA SOLA VOLTA.
            </Typography>
            
            <Button 
                variant="contained"
                color="error" // Colore più appropriato per un'azione critica
                onClick={handleOpenConfirm}
                disabled={loading}
            >
                {loading ? 'Migrazione in corso...' : 'AVVIA MIGRAZIONE STAFF (UNA TANTUM)'}
            </Button>

            {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}

            {result && (
                <Alert severity={result.status === 'success' ? 'success' : 'warning'} sx={{ mt: 2 }}>
                    {result.message}
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            <Dialog open={openConfirm} onClose={handleCloseConfirm}>
                <DialogTitle>CONFERMA MIGRAZIONE STAFF</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Stai per marchiare in modo permanente tutti gli utenti in 'utenti_master' come personale 'staff' nel sistema di autenticazione.
                        <br/><br/>
                        Questa operazione è irreversibile e va eseguita UNA SOLA VOLTA.
                        <br/><br/>
                        Sei assolutamente sicuro di voler procedere?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirm}>Annulla</Button>
                    <Button onClick={handleRunMigration} color="error" variant="contained" autoFocus>
                        Sì, sono sicuro. AVVIA.
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MigrationRunner;
