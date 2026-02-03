import { Box, Typography, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Paper, CircularProgress, Alert } from '@mui/material';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase'; // <-- Corretto da 'firestore' a 'db'
import dayjs from 'dayjs';

const ArchivioRapportini = () => {
    // Utilizza 'db' come da esportazione in firebase.ts
    const rapportiniQuery = query(collection(db, 'rapportini'), orderBy('data', 'desc'));
    const [rapportiniSnapshot, loading, error] = useCollection(rapportiniQuery);

    if (loading) {
        return <CircularProgress />;
    }

    if (error) {
        return <Alert severity="error">Errore nel caricamento dei rapportini: {error.message}</Alert>;
    }

    return (
        <Box>
            <Typography variant="h5" component="h1" gutterBottom>
                Archivio Rapportini
            </Typography>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="tabella rapportini">
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tecnico Principale</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cliente / Nave / Luogo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Ore</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descrizione</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rapportiniSnapshot?.docs.map((doc) => {
                            const rapportino = doc.data();
                            // Fallback for missing or malformed data
                            const dataValida = rapportino.data && typeof rapportino.data.toDate === 'function';
                            const primoTecnico = rapportino.tecnici && rapportino.tecnici.length > 0 ? rapportino.tecnici[0].nome : 'N/A';
                            const luogo = rapportino.nave?.nome || rapportino.luogo?.nome || 'N/D';

                            return (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        {dataValida ? dayjs(rapportino.data.toDate()).format('DD/MM/YYYY') : 'Data mancante'}
                                    </TableCell>
                                    <TableCell>{primoTecnico}</TableCell>
                                    <TableCell>{luogo}</TableCell>
                                    <TableCell align="right">{rapportino.oreLavorate || 0}</TableCell>
                                    <TableCell>{rapportino.breveDescrizione || ''}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ArchivioRapportini;
