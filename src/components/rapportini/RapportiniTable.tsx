
import React, { useMemo } from 'react';
import { Rapportino } from '@/models/definitions';
import { useGlobalStore } from '@/stores/globalStore'; // SOSTITUITO
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
  // Usiamo useGlobalStore per ottenere le mappe delle anagrafiche
  const { tecniciMap, clientiMap, naviMap, luoghiMap, tipiGiornataMap } = useGlobalStore(state => ({
      tecniciMap: state.tecniciMap,
      clientiMap: state.clientiMap,
      naviMap: state.naviMap,
      luoghiMap: state.luoghiMap,
      tipiGiornataMap: state.tipiGiornataMap,
  }));

  // La logica di processamento dati rimane identica
  const processedData = useMemo(() => {
    return rapportini.map(r => {
        const dataInizio = r.dataInizio || r.data;
        const dataValida = dataInizio ? (typeof dataInizio.seconds === 'number' ? dayjs(new Date(dataInizio.seconds * 1000)) : dayjs(dataInizio)) : dayjs();

        const tecnicoPrincipale = tecniciMap.get(r.tecnicoId);
        const nomeTecnico = tecnicoPrincipale ? `${tecnicoPrincipale.cognome} ${tecnicoPrincipale.nome}`.trim() : `ID: ${r.tecnicoId}`;
      
        const altriTecniciCount = r.presenze?.filter(pId => pId !== r.tecnicoId).length || 0;
        const displayTecnici = `${nomeTecnico} ${altriTecniciCount > 0 ? `(+${altriTecniciCount})` : ''}`;
        
        const oreLavoro = r.dettaglioOreTecnici?.reduce((acc, curr) => acc + (curr.ore || 0), 0) || r.oreLavoro || 0;
        const oreResponsabile = r.dettaglioOreTecnici?.find(d => d.tecnicoId === r.tecnicoId)?.ore || 0;

        const nave = naviMap.get(r.naveId || '');
        const luogo = luoghiMap.get(r.luogoId || '');
        const cliente = clientiMap.get(nave?.clienteId || luogo?.clienteId || '');

        return {
            id: r.id,
            data: dataValida.format('DD/MM/YYYY'),
            tecnici: displayTecnici,
            tipoGiornata: tipiGiornataMap.get(r.tipoGiornataId)?.nome || 'N/D',
            ordineLavoro: r.ordineLavoro || 'N/A',
            nave: nave?.nome || 'Altro',
            luogo: luogo?.nome || 'N/D',
            cliente: cliente?.nome || 'N/D',
            oreResp: `${oreResponsabile}h`,
            oreTotali: `${oreLavoro}h`,
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
            <TableCell>Nave/Luogo</TableCell>
            <TableCell>Cliente</TableCell>
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
                  color={row.tipoGiornata.toLowerCase().includes('ferie') || row.tipoGiornata.toLowerCase().includes('malattia') ? 'warning' : 'primary'}
                />
              </TableCell>
              <TableCell>{row.ordineLavoro}</TableCell>
              <TableCell>{row.nave !== 'Altro' ? row.nave : row.luogo}</TableCell>
              <TableCell>{row.cliente}</TableCell>
              <TableCell sx={{fontWeight: 'bold'}}>{row.oreTotali}</TableCell>
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
