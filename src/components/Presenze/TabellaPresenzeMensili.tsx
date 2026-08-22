
import { FC } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';
import { PresenzaRow } from '@/utils/presenzeUtils';
import dayjs from 'dayjs';

interface TabellaPresenzeMensiliProps {
    rows: PresenzaRow[];
    loading: boolean;
}

const TabellaPresenzeMensili: FC<TabellaPresenzeMensiliProps> = ({ rows, loading }) => {

    if (loading) return null; // La pagina genitore mostra gia' un loader

    if (rows.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Nessun dato di presenza trovato per i filtri selezionati.</Typography>
            </Box>
        );
    }

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{fontWeight: 'bold'}}>Data</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}}>Tecnico</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}}>Luogo/Nave</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}} align="center">Ingresso</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}} align="center">Uscita</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.data}</TableCell>
                            <TableCell>{row.tecnicoName}</TableCell>
                            <TableCell>{row.luogoNave}</TableCell>
                            <TableCell align="center">
                                {row.orarioIngresso ? dayjs(row.orarioIngresso).format('HH:mm') : '--'}
                            </TableCell>
                             <TableCell align="center">
                                {row.orarioUscita ? dayjs(row.orarioUscita).format('HH:mm') : '--'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TabellaPresenzeMensili;
