
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { useState } from 'react';

const VersioneAppTab = () => {
    const [updating, setUpdating] = useState(false);
    const [updateLog, setUpdateLog] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleUpdate = async () => {
        setUpdating(true);
        setUpdateLog([]);
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/update', { method: 'POST' });
            
            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const read = async () => {
                const { done, value } = await reader.read();
                if (done) {
                    setUpdating(false);
                    return;
                }

                const chunk = decoder.decode(value, { stream: true });
                // SSE format: data: message\n\n
                const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
                const messages = lines.map(line => line.substring(6));

                setUpdateLog(prevLog => [...prevLog, ...messages]);
                read(); // Continue reading
            };

            read();

        } catch (err: any) {
            console.error('Update failed:', err);
            setError(err.message || "An unknown error occurred.");
            setUpdating(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Versione Applicazione
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
                Master Office V 1.5.1
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleUpdate} 
                    disabled={updating}
                >
                    {updating ? 'Aggiornamento in corso...' : 'Controlla aggiornamenti'}
                </Button>
                {updating && <CircularProgress size={24} />}
            </Box>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Errore durante l'aggiornamento: {error}
                </Alert>
            )}

            {updateLog.length > 0 && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 300, overflowY: 'auto' }}>
                    <Typography variant="subtitle2">Log dell'aggiornamento:</Typography>
                    <pre><code>{updateLog.join('\n')}</code></pre>
                </Box>
            )}
        </Box>
    );
};

export default VersioneAppTab;
