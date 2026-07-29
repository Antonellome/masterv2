
import { useState } from 'react';
import { Button, Card, CardContent, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { syncStandard } from '@/services/SyncService';

const DatiTab = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const handleSyncAnagrafiche = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    console.log('Avvio sincronizzazione manuale delle anagrafiche...');

    try {
      await syncStandard();
      const successMessage = 'Sincronizzazione delle anagrafiche completata con successo!';
      console.log(successMessage);
      setSyncResult({ status: 'success', message: successMessage });
    } catch (error) {
      const errorMessage = 'Errore durante la sincronizzazione delle anagrafiche.';
      console.error(errorMessage, error);
      setSyncResult({ status: 'error', message: `${errorMessage} Controlla la console per i dettagli.` });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" component="h3" gutterBottom>
          Sincronizzazione Anagrafiche
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Questa operazione forza la sincronizzazione di tutte le anagrafiche (clienti, navi, tecnici, etc.) con il server. Utile per assicurarsi di avere gli ultimi dati disponibili.
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSyncAnagrafiche} 
          disabled={isSyncing}
          startIcon={isSyncing ? <CircularProgress size={20} /> : null}
        >
          {isSyncing ? 'Sincronizzazione in corso...' : 'Sincronizza Anagrafiche'}
        </Button>

        {syncResult && (
          <Alert severity={syncResult.status} sx={{ mt: 3 }}>
            {syncResult.message}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DatiTab;
