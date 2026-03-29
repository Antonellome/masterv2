import { Typography, Paper, Box } from '@mui/material';

const GeneralSettingsTab = () => {
  return (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Benvenuto in Riso Master Office
      </Typography>
      <Typography variant="body1" paragraph>
        Questa è la tua centrale di controllo per la gestione dei rapportini di lavoro. Da qui puoi navigare tra le diverse sezioni dell'applicazione utilizzando il menu laterale.
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cosa puoi fare:
        </Typography>
        <ul>
          <li><Typography variant="body1"><b>Dashboard:</b> Visualizza un riepilogo delle tue attività recenti e delle statistiche principali.</Typography></li>
          <li><Typography variant="body1"><b>Rapportini:</b> Crea, modifica ed esporta i rapportini di lavoro mensili.</Typography></li>
          <li><Typography variant="body1"><b>Clienti e Ditte:</b> Gestisci l'anagrafica dei tuoi clienti e delle ditte per cui lavori.</Typography></li>
          <li><Typography variant="body1"><b>Impostazioni:</b> Personalizza l'aspetto dell'app, gestisci gli utenti, definisci gli orari standard e molto altro.</Typography></li>
        </ul>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
        Questa applicazione è progettata per semplificare la burocrazia e farti risparmiare tempo prezioso.
      </Typography>
    </Paper>
  );
};

export default GeneralSettingsTab;
