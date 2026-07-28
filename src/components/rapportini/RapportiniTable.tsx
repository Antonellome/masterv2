
import React, { useMemo } from 'react';
import { Rapportino } from '@/models/definitions';
import { useData } from '@/contexts/DataContext';
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Paper, IconButton, Box, Typography, Chip 
} from '@mui/material';
import { Edit, Delete, Print, ContentCopy } from '@mui/icons-material';
import dayjs from 'dayjs';

interface RapportiniTableProps {
  rapportini: Rapportino[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPrint: (id: string) => void;
  onCopy: (id: string) => void;
}

const RapportiniTable: React.FC<RapportiniTableProps> = ({ rapportini, onEdit, onDelete, onPrint, onCopy }) => {
  // Usiamo il DataContext per ottenere le mappe delle anagrafiche
  const { tecniciMap, clientiMap, naviMap, luoghiMap, tipiGiornataMap } = useData();

  // Memoizziamo i dati processati per evitare ricalcoli inutili
  const processedData = useMemo(() => {
    return rapportini.map(r => {
      const tecnicoPrincipale = tecniciMap.get(r.tecnicoId);
      const nomeTecnico = tecnicoPrincipale ? `${tecnicoPrincipale.nome} ${tecnicoPrincipale.cognome}` : `ID: ${r.tecnicoId}`;
      
      const altriTecniciCount = r.presenze?.filter(pId => pId !== r.tecnicoId).length || 0;
      const displayTecnici = `${nomeTecnico} ${altriTecniciCount > 0 ? `(+${altriTecniciCount})` : ''}`;

      return {
        id: r.id,
        data: dayjs(r.dataInizio).format('DD/MM/YYYY'),
        tecnici: displayTecnici,
        tipoGiornata: tipiGiornataMap.get(r.tipoGiornataId)?.nome || 'N/D',
        ordineLavoro: r.numeroOrdine || 'N/A',
        nave: naviMap.get(r.naveId)?.nome || 'Altro',
        luogo: luoghiMap.get(r.luogoId)?.nome || 'N/D',
        cliente: clientiMap.get(naviMap.get(r.naveId)?.clienteId || luoghiMap.get(r.luogoId)?.clienteId || r.clienteId)?.nome || 'N/D',
        oreResp: `${r.oreResponsabile}h`,
        oreTotali: `${r.oreTotali}h`,
      };
    });
  }, [rapportini, tecniciMap, clientiMap, naviMap, luoghiMap, tipiGiornataMap]);

  return (
    <TableContainer component={Paper} elevation={3} sx={{ overflowX: 'auto' }}>
      <Table stickyHeader aria-label="Tabella Rapportini">
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Tecnici</TableCell>
            <TableCell>Tipo Giornata</TableCell>
            <TableCell>Ordine Lavoro</TableCell>
            <TableCell>Nave</TableCell>
            <TableCell>Luogo</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Ore Resp.</TableCell>
            <TableCell>Ore Totali</TableCell>
            <TableCell align="right">Azioni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {processedData.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.data}</TableCell>
              <TableCell>{row.tecnici}</TableCell>
              <TableCell>
                <Chip 
                  label={row.tipoGiornata} 
                  size="small"
                  color={row.tipoGiornata === 'Straordinario' ? 'secondary' : (row.tipoGiornata === 'Permesso' ? 'warning' : 'primary')}
                />
              </TableCell>
              <TableCell>{row.ordineLavoro}</TableCell>
              <TableCell>{row.nave}</TableCell>
              <TableCell>{row.luogo}</TableCell>
              <TableCell>{row.cliente}</TableCell>
              <TableCell>{row.oreResp}</TableCell>
              <TableCell>{row.oreTotali}</TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => onEdit(row.id)} aria-label="Modifica">
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => onCopy(row.id)} aria-label="Copia">
                    <ContentCopy />
                  </IconButton>
                   <IconButton size="small" onClick={() => onPrint(row.id)} aria-label="Stampa">
                    <Print />
                  </IconButton>
                   <IconButton size="small" onClick={() => onDelete(row.id)} aria-label="Elimina">
                    <Delete color="error"/>
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RapportiniTable;
