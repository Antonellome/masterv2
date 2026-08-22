
import { FC } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';
import { InterventoRow } from '@/utils/presenzeUtils';
import dayjs from 'dayjs';

interface OrarioCellProps {
    impostato: Date | null;
    reale: Date | null;
}

// Componente riutilizzabile per visualizzare la coppia di orari
const OrarioCell: FC<OrarioCellProps> = ({ impostato, reale }) => (
    <Box>
        <Typography variant="body2">{reale ? dayjs(reale).format('HH:mm:ss') : '--'}</Typography>
        <Typography variant="caption" color="text.secondary">
            (imp: {impostato ? dayjs(impostato).format('HH:mm:ss') : '--'})
        </Typography>
    </Box>
);

interface TabellaInterventiProps {
    rows: InterventoRow[];
}

const TabellaInterventi: FC<TabellaInterventiProps> = ({ rows }) => {
    if (rows.length === 0) {
        return <Typography sx={{p: 2, textAlign: 'center'}}>Nessun intervento trovato.</Typography>;
    }

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{fontWeight: 'bold'}}>Data</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}}>Tecnico</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}}>Luogo/Nave</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}} align="center">Ingresso Intervento</TableCell>
                        <TableCell sx={{fontWeight: 'bold'}} align="center">Uscita Intervento</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.data}</TableCell>
                            <TableCell>{row.tecnicoName}</TableCell>
                            <TableCell>{row.luogoNave}</TableCell>
                            <TableCell align="center">
                                <OrarioCell impostato={row.ingresso.impostato} reale={row.ingresso.reale} />
                            </TableCell>
                             <TableCell align="center">
                               <OrarioCell impostato={row.uscita.impostato} reale={row.uscita.reale} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TabellaInterventi;
