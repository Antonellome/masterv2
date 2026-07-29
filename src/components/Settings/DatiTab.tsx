
import { useState } from 'react';
import { Button, Card, CardContent, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { syncAnagrafiche, syncRapportini } from '@/services/SyncService';

const DatiTab = () => {
  // Stati per la sincronizzazione delle anagrafiche
  const [isSyncingAnagrafiche, setIsSyncingAnagrafiche] = useState(false);
  const [anagraficheResult, setAnagraficheResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  // Stati per la sincronizzazione dei rapportini
  const [isSyncingRapportini, setIsSyncingRapportini] = useState(false);
  const [rapportiniResult, setRapportiniResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const handleSyncAnagrafiche = async () => {
    setIsSyncingAnagrafiche(true);
    setAnagraficheResult(null);
    try {
      await syncAnagrafiche();
      setAnagraficheResult({ status: 'success', message: 'Sincronizzazione anagrafiche completata con successo!' });
    } catch (error) {
      const message = 'Errore durante la sincronizzazione delle anagrafiche.';
      console.error(message, error);
      setAnagraficheResult({ status: 'error', message: `${message} Controlla la console.` });
    } finally {
      setIsSyncingAnagrafiche(false);
    }
  };

  const handleSyncRapportini = async () => {
    setIsSyncingRapportini(true);
    setRapportiniResult(null);
    try {
      await syncRapportini();
      setRapportiniResult({ status: 'success', message: 'Sincronizzazione rapportini completata con successo!' });
    } catch (error) {
      const message = 'Errore durante la sincronizzazione dei rapportini.';
      console.error(message, error);
      setRapportiniResult({ status: 'error', message: `${message} Controlla la console.` });
    } finally {
      setIsSyncingRapportini(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            Sincronizzazione Anagrafiche
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Forza la sincronizzazione di clienti, navi, tecnici, etc. con il server.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSyncAnagrafiche} 
            disabled={isSyncingAnagrafiche || isSyncingRapportini}
            startIcon={isSyncingAnagrafiche ? <CircularProgress size={20} /> : null}
          >
            {isSyncingAnagrafiche ? 'In corso...' : 'Sincronizza Anagrafiche'}
          </Button>
          {anagraficheResult && (
            <Alert severity={anagraficheResult.status} sx={{ mt: 2 }}>
              {anagraficheResult.message}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            Sincronizzazione Rapportini
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Forza la sincronizzazione dei rapportini di intervento con il server.
          </Typography>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleSyncRapportini} 
            disabled={isSyncingAnagrafiche || isSyncingRapportini}
            startIcon={isSyncingRapportini ? <CircularProgress size={20} /> : null}
          >
            {isSyncingRapportini ? 'In corso...' : 'Sincronizza Rapportini'}
          </Button>
          {rapportiniResult && (
            <Alert severity={rapportiniResult.status} sx={{ mt: 2 }}>
              {rapportiniResult.message}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DatiTab;
