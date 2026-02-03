import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Typography
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import type { Luogo } from '@/models/definitions'; // <-- PERCORSO CORRETTO

interface LuoghiListProps {
  luoghi: Luogo[];
  onEdit: (luogo: Luogo) => void;
  onDelete: (id: string) => void;
}

const LuoghiList: React.FC<LuoghiListProps> = ({ luoghi, onEdit, onDelete }) => {
  if (!luoghi || luoghi.length === 0) {
    return <Typography sx={{ textAlign: 'center', mt: 4 }}>Nessun luogo trovato.</Typography>;
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2, boxShadow: 'none', border: '1px solid rgba(224, 224, 224, 1)' }}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Nome Luogo</TableCell>
            <TableCell align="right">Azioni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {luoghi.map((luogo) => (
            <TableRow key={luogo.id}>
              <TableCell component="th" scope="row">
                <Typography variant="body1">{luogo.nome}</Typography>
              </TableCell>
              <TableCell align="right">
                <IconButton onClick={() => onEdit(luogo)} aria-label="edit">
                  <Edit />
                </IconButton>
                <IconButton onClick={() => onDelete(luogo.id)} aria-label="delete">
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LuoghiList;
