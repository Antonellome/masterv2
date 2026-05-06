import React from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Divider, Icon
} from '@mui/material';
import Summarize from '@mui/icons-material/Summarize';
import type { Rapportino, Tecnico } from '@/models/definitions'; 
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';

interface GeneratedReportViewProps {
  rapportini: Rapportino[];
  tecnici: Tecnico[];
  anno: number;
  mese: number;
}

interface ReportData {
    tecnico: Tecnico;
    oreTotali: number;
    rapportini: Rapportino[];
}

const GeneratedReportView = React.forwardRef<HTMLDivElement, GeneratedReportViewProps>(({ rapportini, tecnici, anno, mese }, ref) => {
  const theme = useTheme();
  const meseNome = new Date(anno, mese - 1).toLocaleString('it-IT', { month: 'long' });

  const reportData: ReportData[] = tecnici.map(tecnico => {
    const rapportiniDelTecnico = rapportini.filter(r => r.tecnicoScrivente.id === tecnico.id);
    const oreTotali = rapportiniDelTecnico.reduce((acc, r) => acc + (r.oreLavorate || 0), 0);
    return {
      tecnico,
      oreTotali,
      rapportini: rapportiniDelTecnico,
    };
  }).filter(data => data.rapportini.length > 0);

  const oreComplessive = reportData.reduce((acc, data) => acc + data.oreTotali, 0);

  return (
    <Paper elevation={0} sx={{ m: 'auto', maxWidth: 900, p: 3 }}>
        <Box ref={ref} sx={{p: 4}}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Icon component={Summarize} sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h5" component="div" fontWeight="bold">
                        Report Mensile Riepilogativo
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Periodo: {`${meseNome.charAt(0).toUpperCase() + meseNome.slice(1)} ${anno}`}
                    </Typography>
                </Box>
            </Box>

            {reportData.length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{py: 5}}>Nessun dato trovato per i criteri selezionati.</Typography>
            ) : (
                reportData.map(data => (
                    <Box key={data.tecnico.id} sx={{ mb: 4 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, mb: 2, border: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="h6">{`${data.tecnico.nome} ${data.tecnico.cognome}`}</Typography>
                            <Typography variant="subtitle1" color="text.secondary">Ore totali lavorate: <Typography component="span" fontWeight="bold" color="text.primary">{data.oreTotali}</Typography></Typography>
                        </Box>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
                                    <TableRow>
                                        <TableCell sx={{fontWeight: 'bold'}}>Data</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>Nave / Luogo</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>Dettaglio</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>Orario</TableCell>
                                        <TableCell align="right" sx={{fontWeight: 'bold'}}>Ore</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.rapportini.map(r => (
                                        <TableRow key={r.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell>{dayjs(r.data.toDate()).format('DD/MM/YY')}</TableCell>
                                            <TableCell>{r.nave?.nome || r.luogo?.nome || 'N/D'}</TableCell>
                                            <TableCell>{r.breveDescrizione}</TableCell>
                                            <TableCell>{r.orarioInizio} - {r.orarioFine}</TableCell>
                                            <TableCell align="right">{r.oreLavorate || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ))
            )}
            <Divider sx={{ my: 3 }} />
            <Box sx={{display: 'flex', justifyContent: 'flex-end'}}>
                <Typography variant="h6" align="right">Totale Ore Complessive: <Typography component="span" color="primary" variant="h5" fontWeight="bold">{oreComplessive}</Typography></Typography>
            </Box>
        </Box>
    </Paper>
  );
});

export default GeneratedReportView;
