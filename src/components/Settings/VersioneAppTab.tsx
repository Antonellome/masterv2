
import { Box, Button, Typography, CircularProgress, Alert, Snackbar } from '@mui/material';
import { useState, useCallback } from 'react';

const VersioneAppTab = () => {
    // Stati per il processo di CONTROLLO
    const [checking, setChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState<boolean | null>(null);
    const [checkError, setCheckError] = useState<string | null>(null);

    // Stati per il processo di INSTALLAZIONE
    const [installing, setInstalling] = useState(false);
    const [installLog, setInstallLog] = useState<string[]>([]);
    const [installError, setInstallError] = useState<string | null>(null);

    // Stato per la notifica
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const handleCheck = useCallback(async () => {
        setChecking(true);
        setUpdateAvailable(null);
        setCheckError(null);
        setInstallLog([]); // Pulisce i log vecchi

        try {
            const response = await fetch('http://localhost:3001/check-for-update');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setUpdateAvailable(data.updateAvailable);
            if (!data.updateAvailable) {
                setSnackbarOpen(true); // Mostra notifica "Nessun aggiornamento"
            }
        } catch (err: any) {
            console.error('Check failed:', err);
            setCheckError(err.message || "An unknown error occurred while checking.");
        } finally {
            setChecking(false);
        }
    }, []);

    const handleInstall = useCallback(async () => {
        setInstalling(true);
        setInstallLog([]);
        setInstallError(null);

        try {
            const response = await fetch('http://localhost:3001/update', { method: 'POST' });
            
            if (!response.body) {
                throw new Error("No response body from update server");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const read = async () => {
                const { done, value } = await reader.read();
                if (done) {
                    setInstalling(false);
                    return;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
                const messages = lines.map(line => line.substring(6));

                setInstallLog(prevLog => [...prevLog, ...messages]);
                read(); // Continua a leggere lo stream
            };

            read();

        } catch (err: any) {
            console.error('Install failed:', err);
            setInstallError(err.message || "An unknown error occurred during installation.");
            setInstalling(false);
        }
    }, []);

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Versione Applicazione
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
                Master Office V 2.0
            </Typography>

            {/* --- SEZIONE CONTROLLO AGGIORNAMENTI --- */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleCheck} 
                    disabled={checking || installing}
                >
                    {checking ? 'Controllo in corso...' : 'Controlla aggiornamenti'}
                </Button>
                {checking && <CircularProgress size={24} />}
            </Box>

            {checkError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Errore durante il controllo: {checkError}
                </Alert>
            )}

            {/* --- SEZIONE INSTALLAZIONE AGGIORNAMENTI --- */}
            {updateAvailable === true && !installing && (
                 <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography>Nuova versione disponibile!</Typography>
                    <Button 
                        variant="contained" 
                        color="success"
                        onClick={handleInstall}
                        sx={{ mt: 1 }}
                    >
                        Installa Aggiornamento
                    </Button>
                </Alert>
            )}

            {installing && (
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Typography>Installazione in corso...</Typography>
                    <CircularProgress size={24} />
                </Box>
            )}

            {installError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Errore durante l'installazione: {installError}
                </Alert>
            )}
            
            {installLog.length > 0 && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 300, overflowY: 'auto', backgroundColor: '#1E1E1E' }}>
                    <Typography variant="subtitle2">Log di installazione:</Typography>
                    <pre><code>{installLog.join('')}</code></pre>
                </Box>
            )}

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                message="L'applicazione è già aggiornata."
            />
        </Box>
    );
};

export default VersioneAppTab;
