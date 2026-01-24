import React, { forwardRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Typography, Box, Paper, Divider, Chip
} from '@mui/material';
import type { Rapportino, Timestamp } from '@/models/definitions'; // <-- CORRETTO
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';

interface RapportinoViewProps {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  rapportino: Rapportino | null;
}

const DetailItem: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <Grid
    size={{
      xs: 12,
      sm: 6
    }}>
    <Typography variant="caption" color="text.secondary" component="div">{label.toUpperCase()}</Typography>
    <Typography variant="body1" sx={{ minHeight: '24px' }}>{value || 'N/D'}</Typography>
  </Grid>
);

const RapportinoView = forwardRef<HTMLDivElement, RapportinoViewProps>((props, ref) => {
  const { open, onClose, onPrint, rapportino } = props;
  const theme = useTheme();

  if (!rapportino) {
    return null;
  }

  const { 
    data, giornata, descrizione, nave, luogo, cliente, tecnicoScrivente, 
    lavoriEseguiti, materialiImpiegati, veicolo, tecniciAggiunti,
    oraInizio, oraFine, pausa, oreLavorate
  } = rapportino;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
        Dettaglio Rapportino
        <Typography variant="body2" color="text.secondary">
          {dayjs((data as Timestamp).toDate()).format('dddd D MMMM YYYY')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box ref={ref} sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Paper elevation={0} sx={{ p: 2, borderLeft: `4px solid ${theme.palette.primary.main}`, backgroundColor: theme.palette.action.hover }}>
                <Grid container spacing={2}>
                  <DetailItem label="Cliente" value={cliente?.nome} />
                  <DetailItem label="Nave / Sede" value={nave?.nome || luogo?.nome} />
                  <DetailItem label="Tecnico Principale" value={`${tecnicoScrivente?.nome} ${tecnicoScrivente?.cognome}`} />
                  <DetailItem label="Tipo Giornata" value={<Chip label={giornata.toString()} size="small" />} />
                </Grid>
              </Paper>
            </Grid>

            <Grid size={12}>
              <Typography variant="h6">Descrizione Attività</Typography>
              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{descrizione || 'Nessuna descrizione.'}</Typography>
            </Grid>

            <Grid size={12}><Divider /></Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Lavori Eseguiti</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{lavoriEseguiti || 'Nessuno.'}</Typography>
              </Paper>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Materiali Impiegati</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{materialiImpiegati || 'Nessuno.'}</Typography>
              </Paper>
            </Grid>

            <Grid size={12}><Divider /></Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Typography variant="h6" gutterBottom>Dettagli Orario</Typography>
                {oreLavorate ? (
                    <DetailItem label="Ore Totali" value={`${oreLavorate} ore`} />
                ) : (
                    <>
                        <DetailItem label="Inizio" value={oraInizio} />
                        <DetailItem label="Fine" value={oraFine} />
                        <DetailItem label="Pausa" value={pausa ? `${pausa} min` : 'N/D'} />
                    </>
                )}
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Typography variant="h6" gutterBottom>Personale e Mezzi</Typography>
                <DetailItem label="Veicolo" value={veicolo ? `${veicolo.veicolo} (${veicolo.targa})` : 'Nessuno'} />
                <DetailItem label="Altri Tecnici" value={tecniciAggiunti && tecniciAggiunti.length > 0 ? tecniciAggiunti.map(t => t.nome).join(', ') : 'Nessuno'} />
            </Grid>

          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose}>Chiudi</Button>
        <Button variant="contained" onClick={onPrint}>Stampa</Button>
      </DialogActions>
    </Dialog>
  );
});

RapportinoView.displayName = 'RapportinoView';

export default RapportinoView;
