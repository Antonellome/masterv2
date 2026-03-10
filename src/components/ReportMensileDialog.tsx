import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  CircularProgress,
  DialogContentText,
  Box,
  Slide,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  type TransitionProps,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Rapportino, Tecnico } from '@/models/definitions';
import GeneratedReportView from './GeneratedReportView';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface ReportMensileDialogProps {
  open: boolean;
  onClose: () => void;
  tecnico: Tecnico;
}

const ReportMensileDialog: React.FC<ReportMensileDialogProps> = ({ open, onClose, tecnico }) => {
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [mese, setMese] = useState(new Date().getMonth() + 1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<Rapportino[] | null>(null);

  const handleGenerate = async () => {
    if (!tecnico) return;
    setIsGenerating(true);
    setGeneratedReport(null);

    const startDate = Timestamp.fromDate(new Date(anno, mese - 1, 1));
    const endDate = Timestamp.fromDate(new Date(anno, mese, 0, 23, 59, 59));

    const q = query(
      collection(db, 'rapportini'),
      where('data', '>=', startDate),
      where('data', '<', endDate),
      where('tecnicoScrivente.id', '==', tecnico.id)
    );

    try {
      const snapshot = await getDocs(q);
      const reportData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Rapportino));
      setGeneratedReport(reportData);
    } catch (error) {
      console.error("Errore nella generazione del report:", error);
      setGeneratedReport([]);
    }

    setIsGenerating(false);
  };

  const handleCloseAndReset = () => {
    setGeneratedReport(null);
    onClose();
  };

  const anni = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const mesi = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('it-IT', { month: 'long' })
  }));

  return (
    <>
      <Dialog open={open && generatedReport === null} onClose={handleCloseAndReset} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h5">Genera Report per</Typography>
            <Typography variant="h6" color="primary">{tecnico?.nome} {tecnico?.cognome}</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <DialogContentText sx={{mb: 3}}>Seleziona il periodo desiderato per generare il report mensile.</DialogContentText>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Anno</InputLabel>
                <Select value={anno} onChange={(e) => setAnno(e.target.value as number)} label="Anno">{anni.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Mese</InputLabel>
                <Select value={mese} onChange={(e) => setMese(e.target.value as number)} label="Mese">{mesi.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{p: '16px 24px'}}>
          <Button onClick={handleCloseAndReset} disabled={isGenerating}>Annulla</Button>
          <Box sx={{ position: 'relative' }}>
            <Button onClick={handleGenerate} variant="contained" color="primary" size="large" disabled={isGenerating}>Genera</Button>
            {isGenerating && <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />}
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        fullScreen
        open={generatedReport !== null}
        onClose={handleCloseAndReset}
        TransitionComponent={Transition}
      >
          <AppBar sx={{ position: 'relative' }}>
              <Toolbar>
                  <IconButton edge="start" color="inherit" onClick={handleCloseAndReset} aria-label="close">
                      <CloseIcon />
                  </IconButton>
                  <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                      Report per {tecnico?.nome} {tecnico?.cognome} - {mesi.find(m => m.value === mese)?.label} {anno}
                  </Typography>
              </Toolbar>
          </AppBar>
          {generatedReport && (
              <GeneratedReportView 
                  rapportini={generatedReport}
                  tecnici={tecnico ? [tecnico] : []}
                  anno={anno}
                  mese={mese}
              />
          )}
      </Dialog>
    </>
  );
};

export default ReportMensileDialog;
