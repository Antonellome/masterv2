
import { FC } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';
import { Intervento } from '@/models/definitions';
import { useAnagrafiche } from '@/contexts/AnagraficheContext';
import dayjs from 'dayjs';

interface OrarioCellProps {
    impostato: Date | null;
    reale: Date | null;
}

const OrarioCell: FC<OrarioCellProps> = ({ impostato, reale }) => (
    <Box>
        <Typography variant="body2">{reale ? dayjs(reale).format('HH:mm:ss') : '--'}</Typography>
        <Typography variant="caption" color="text.secondary">
            (imp: {impostato ? dayjs(impostato).format('HH:mm:ss') : '--'})
        </Typography>
    </Box>
);

interface TabellaInterventiProps {
    rows: Intervento[];
}

const TabellaInterventi: FC<TabellaInterventiProps> = ({ rows }) => {
    const anagrafiche = useAnagrafiche();

    if (rows.length === 0) {
        return <Typography sx={{ p: 2, textAlign: 'center' }}>Nessun intervento trovato.</Typography>;
    }

    const getLuogoNaveName = (intervento: Intervento) => {
        if (intervento.naveId) {
            const nave = anagrafiche?.navi.find(n => n.id === intervento.naveId);
            return nave?.nome || `Nave ID: ${intervento.naveId}`;
        }
        if (intervento.luogoId) {
            const luogo = anagrafiche?.luoghi.find(l => l.id === intervento.luogoId);
            return luogo?.nome || `Luogo ID: ${intervento.luogoId}`;
        }
        return '--';
    };

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tecnico</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Luogo/Nave</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Ingresso Intervento</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Uscita Intervento</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{dayjs(row.data).format('DD/MM/YYYY')}</TableCell>
                            <TableCell>{row.tecnicoName}</TableCell>
                            <TableCell>{getLuogoNaveName(row)}</TableCell>
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
