import React from 'react';
import {
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  Box,
  CircularProgress,
  TablePagination
} from '@mui/material';
import { format } from 'date-fns';
import it from 'date-fns/locale/it';
import type { Rapportino } from '../../models/definitions'; // <-- Corretto: Importa il tipo corretto

interface RisultatiRicercaProps {
  risultati: Rapportino[];
  loading: boolean;
}

const RisultatiRicerca: React.FC<RisultatiRicercaProps> = ({ risultati, loading }) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!risultati || risultati.length === 0) {
    return <Typography sx={{ mt: 4, textAlign: 'center' }}>Nessun risultato da mostrare. Prova a modificare i filtri.</Typography>;
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', mt: 2 }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="tabella risultati ricerca">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Tecnico</TableCell>
              <TableCell>Nave/Luogo</TableCell>
              <TableCell align="right">Ore Totali</TableCell>
              <TableCell>Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {risultati.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((rapportino) => (
              <TableRow hover role="checkbox" tabIndex={-1} key={rapportino.id}>
                <TableCell>{rapportino.data?.toDate ? format(rapportino.data.toDate(), 'dd/MM/yyyy', { locale: it }) : 'Data non valida'}</TableCell>
                {/* Assicurati che questi campi esistano nel tipo Rapportino importato */}
                <TableCell>{rapportino.tecnicoScrivente?.nome || 'N/D'}</TableCell>
                <TableCell>{rapportino.nave?.nome || rapportino.luogo?.nome || 'N/D'}</TableCell>
                <TableCell align="right">{rapportino.oreLavorate || 0}</TableCell>
                <TableCell sx={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rapportino.breveDescrizione || ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={risultati.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Righe per pagina"
      />
    </Paper>
  );
};

export default RisultatiRicerca;
