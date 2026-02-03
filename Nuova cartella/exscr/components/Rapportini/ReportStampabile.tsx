import React from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import type { Rapportino, Tecnico } from '@/models/definitions'; // <-- CORRETTO

interface ReportStampabileProps {
    data: Rapportino[];
    tecnico: Tecnico | undefined;
    mese: string; // <-- CORRETTO (ora è una stringa, es. "Gennaio")
    anno: number;
}

const ReportStampabile = React.forwardRef<HTMLDivElement, ReportStampabileProps>(({ data, tecnico, mese, anno }, ref) => {
    const theme = useTheme();
    if (!data) return null;

    // Calcolo robusto delle ore totali
    const totalOre = data.reduce((acc, item) => {
        const ore = item.oreLavorate;
        return acc + (typeof ore === 'number' && !isNaN(ore) ? ore : 0);
    }, 0);

    return (
        <div ref={ref}>
            <Box p={4}>
                {/* Intestazione del Report */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                            Report Mensile
                        </Typography>
                        <Typography variant="h6" component="h2" color="text.secondary">
                            Tecnico: {tecnico?.nome} {tecnico?.cognome}
                        </Typography>
                    </Box>
                    <Typography variant="h5" component="div" color="text.primary">
                        {mese} {anno}
                    </Typography>
                </Box>
                <Divider sx={{ my: 2 }}/>

                {/* Tabella dei Rapportini */}
                <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Data</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Cliente / Nave / Luogo</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '45%' }}>Descrizione Attività</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '15%' }} align="right">Ore</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>
                                        {item.data && typeof item.data.toDate === 'function'
                                            ? dayjs(item.data.toDate()).format('DD/MM/YYYY')
                                            : 'N/D'}
                                    </TableCell>
                                    <TableCell>{item.cliente?.nome || item.nave?.nome || item.luogo?.nome || 'N/D'}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.descrizione || '-'}</TableCell>
                                    <TableCell align="right">{item.oreLavorate || 0}</TableCell>
                                </TableRow>
                            ))}
                             {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">Nessun dato per il periodo selezionato.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Riepilogo Totale Ore */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[200] }} elevation={0}>
                        <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>Totale Ore: </Typography>
                        <Typography variant="h6" component="span">{totalOre}</Typography>
                    </Paper>
                </Box>
            </Box>
        </div>
    );
});

ReportStampabile.displayName = 'ReportStampabile';

export default ReportStampabile;
