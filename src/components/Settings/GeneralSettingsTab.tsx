import { Typography, Paper, Box } from '@mui/material';

const GeneralSettingsTab = () => {
  return (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Benvenuto in Riso Master Office
      </Typography>
      <Typography variant="body1" paragraph>
        Questa applicazione è un sistema gestionale completo, pensato per aziende di assistenza tecnica. La sua funzione è digitalizzare e centralizzare ogni aspetto della tua operatività quotidiana, dall'ufficio al cantiere.
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cosa puoi fare:
        </Typography>
        <ul>
          <li><Typography variant="body1"><b>Dashboard:</b> Accedi a una visione d'insieme immediata con le statistiche chiave e le attività più recenti.</Typography></li>
          <li><Typography variant="body1"><b>Anagrafiche:</b> Gestisci in modo centralizzato clienti, fornitori, sedi e tutti i contatti cruciali per la tua attività.</Typography></li>
          <li><Typography variant="body1"><b>Rapportini:</b> Compila, modifica e archivia digitalmente i rapportini di intervento. Genera PDF pronti per la stampa e la condivisione con un clic.</Typography></li>
          <li><Typography variant="body1"><b>Tecnici:</b> Amministra l'elenco del tuo personale tecnico, associando interventi e monitorando le attività.</Typography></li>
          <li><Typography variant="body1"><b>Documenti:</b> Crea un archivio digitale per manuali, schede tecniche o qualsiasi altro documento utile, accessibile ovunque ti trovi.</Typography></li>
          <li><Typography variant="body1"><b>Presenze e Scadenze:</b> Tieni traccia delle ore di lavoro e non perdere mai di vista una scadenza importante, che sia un contratto o la manutenzione programmata.</Typography></li>
          <li><Typography variant="body1"><b>Notifiche:</b> Invia comunicazioni dirette e notifiche push ai tecnici sul campo e tieni traccia di tutti i messaggi inviati.</Typography></li>
          <li><Typography variant="body1"><b>Reportistica:</b> Analizza i dati raccolti per ottenere insight preziosi sull'efficienza operativa e sulla redditività dei clienti.</Typography></li>
          <li><Typography variant="body1"><b>Impostazioni:</b> Personalizza l'app secondo le tue esigenze. Gestisci gli accessi degli amministratori, definisci gli orari di lavoro standard, scegli il tema grafico e configura i backup automatici per non perdere mai i tuoi dati.</Typography></li>
        </ul>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
        Progettata per semplificare la complessità e trasformare il tuo modo di lavorare, rendendolo più efficiente e organizzato.
      </Typography>
    </Paper>
  );
};

export default GeneralSettingsTab;
