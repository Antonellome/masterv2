import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import { Timestamp } from 'firebase/firestore';
import { useData } from '@/contexts/DataContext';
import type { Rapportino } from '@/models/definitions';
import dayjs from 'dayjs';
import RapportinoView from '@/components/Rapportini/RapportinoView';
import { useReactToPrint } from 'react-to-print';

interface RapportiniTableProps {
  onEdit: (rapportino: Rapportino) => void;
}

const RapportiniTable: React.FC<RapportiniTableProps> = ({ onEdit }) => {
  // Ora importiamo anche tipiGiornataMap
  const { rapportini, tecniciMap, naviMap, luoghiMap, clientiMap, tipiGiornataMap, loading, error, deleteData } = useData();
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const componentToPrintRef = useRef(null);
  const handlePrint = useReactToPrint({ content: () => componentToPrintRef.current });

  const onEditRef = useRef(onEdit);

  useEffect(() => {
    onEditRef.current = onEdit;
  }, [onEdit]);

  const handleOpenView = useCallback((rapportino: Rapportino) => {
    setSelectedRapportino(rapportino);
    setViewOpen(true);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewOpen(false);
    setSelectedRapportino(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo rapportino?')) {
      await deleteData('rapportini', id);
    }
  }, [deleteData]);

  // Funzione CORRETTA per ottenere i nomi dei tecnici
  const getTecniciNomi = useCallback((rapportino: Rapportino): string => {
    if (!rapportino.presenze || rapportino.presenze.length === 0) {
      return 'N/D';
    }
    const nomi = new Set<string>();
    rapportino.presenze.forEach(tecnicoId => {
      const tecnico = tecniciMap[tecnicoId];
      if (tecnico) {
        nomi.add(`${tecnico.nome} ${tecnico.cognome}`);
      }
    });
    return Array.from(nomi).join(', ');
  }, [tecniciMap]);

  const columns: GridColDef[] = useMemo(() => [
    { field: 'data', headerName: 'Data', width: 120, valueFormatter: params => params.value ? dayjs((params.value as Timestamp).toDate()).format('DD/MM/YYYY') : 'N/D' },
    { 
      field: 'tecnici', 
      headerName: 'Tecnici', 
      flex: 1, 
      minWidth: 200, 
      renderCell: (params) => {
        const nomi = getTecniciNomi(params.row as Rapportino);
        return <Tooltip title={nomi}><Typography noWrap>{nomi}</Typography></Tooltip>;
      } 
    },
    // Colonna TIPO GIORNATA corretta
    {
      field: 'tipoGiornata',
      headerName: 'Tipo Giornata',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        const id = params.row.tipoGiornataId || params.row.giornataId; // Prova entrambi gli ID
        if (tipiGiornataMap && id) {
          return tipiGiornataMap[id]?.nome || 'N/D';
        }
        return 'N/D';
      }
    },
    { field: 'nave', headerName: 'Nave', flex: 1, minWidth: 150, valueGetter: (params) => (params.row.naveId && naviMap[params.row.naveId]?.nome) || 'N/D' },
    { field: 'luogo', headerName: 'Luogo', flex: 1, minWidth: 150, valueGetter: (params) => (params.row.luogoId && luoghiMap[params.row.luogoId]?.nome) || 'N/D' },
    { field: 'cliente', headerName: 'Cliente', flex: 1, minWidth: 150, valueGetter: (params) => (params.row.clienteId && clientiMap[params.row.clienteId]?.nome) || 'N/D' },
    {
      field: 'actions',
      headerName: 'Azioni',
      align: 'right',
      headerAlign: 'right',
      width: 130,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Vedi Dettagli">
                <IconButton onClick={() => handleOpenView(params.row as Rapportino)} size="small"><Visibility /></IconButton>
            </Tooltip>
            <Tooltip title="Modifica">
                <IconButton onClick={() => onEditRef.current(params.row as Rapportino)} size="small"><Edit /></IconButton>
            </Tooltip>
            <Tooltip title="Elimina">
                <IconButton onClick={() => handleDelete(params.row.id as string)} size="small"><Delete /></IconButton>
            </Tooltip>
        </Box>
      ),
    },
  ], [getTecniciNomi, naviMap, luoghiMap, clientiMap, tipiGiornataMap, handleOpenView, handleDelete]);

  const sortedRapportini = useMemo(() => {
      if (!rapportini) return [];
      return [...rapportini].sort((a, b) => {
          const dateA = a.data as Timestamp;
          const dateB = b.data as Timestamp;
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.toMillis() - dateA.toMillis();
      });
  }, [rapportini]);

  if (error) {
    return <Alert severity="error">Errore nel caricamento dei rapportini: {error}</Alert>;
  }

  return (
    <Box sx={{ height: 650, width: '100%' }}>
       <DataGrid
        rows={sortedRapportini}
        columns={columns}
        loading={loading}
        rowHeight={48}
        onRowClick={(params) => handleOpenView(params.row as Rapportino)}
        sx={{
          border: 0,
          color: 'rgba(255,255,255,0.8)',
          '&, .MuiDataGrid-cell, .MuiDataGrid-columnHeader': {
              borderColor: 'rgba(255,255,255,0.1)'
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            color: 'white',
            fontWeight: 'bold',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(255,255,255,0.05)',
            cursor: 'pointer'
          },
          '& .MuiDataGrid-virtualScroller': {
              backgroundColor: 'rgba(0,0,0,0.1)'
          },
          '& .MuiDataGrid-footerContainer': {
              backgroundColor: 'rgba(0,0,0,0.2)',
          },
          '& .MuiTablePagination-root': {
              color: 'rgba(255,255,255,0.8)'
          }
        }}
        slots={{
          loadingOverlay: () => <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }}><CircularProgress color="inherit" /></Box>,
          noRowsOverlay: () => <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography>Nessun rapportino trovato</Typography></Box>,
        }}
      />
      {selectedRapportino && (
        <RapportinoView
          rapportino={selectedRapportino}
          open={viewOpen}
          onClose={handleCloseView}
          onPrint={handlePrint}
          ref={componentToPrintRef}
        />
      )}
    </Box>
  );
};

export default RapportiniTable;
