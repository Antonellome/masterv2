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
  const { rapportini, tecniciMap, naviMap, luoghiMap, clientiMap, loading, error, deleteData } = useData();
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

  const getTecniciNomi = useCallback((rapportino: Rapportino): string => {
    const nomi = new Set<string>();
    if (rapportino.tecnicoScrivente) {
        const tecnico = tecniciMap[rapportino.tecnicoScrivente.id];
        if (tecnico) nomi.add(`${tecnico.nome} ${tecnico.cognome}`);
    }
    rapportino.tecniciAggiunti?.forEach(ref => {
        const tecnico = tecniciMap[ref.id];
        if (tecnico) nomi.add(`${tecnico.nome} ${tecnico.cognome}`);
    });
    return Array.from(nomi).join(', ');
  }, [tecniciMap]);

  const columns: GridColDef[] = useMemo(() => [
    { field: 'data', headerName: 'Data', width: 120, valueFormatter: params => params.value ? dayjs((params.value as Timestamp).toDate()).format('DD/MM/YYYY') : '--' },
    { field: 'tecnici', headerName: 'Tecnici', flex: 1, minWidth: 200, renderCell: (params) => getTecniciNomi(params.row as Rapportino) },
    { field: 'nave', headerName: 'Nave', flex: 1, minWidth: 150, valueGetter: (params) => naviMap[params.row.naveId]?.nome || '--' },
    { field: 'luogo', headerName: 'Luogo', flex: 1, minWidth: 150, valueGetter: (params) => luoghiMap[params.row.luogoId]?.nome || '--' },
    { field: 'cliente', headerName: 'Cliente', flex: 1, minWidth: 150, valueGetter: (params) => clientiMap[params.row.clienteId]?.nome || '--' },
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
  ], [getTecniciNomi, naviMap, luoghiMap, clientiMap, handleOpenView, handleDelete]);

  const sortedRapportini = useMemo(() => {
      return [...(rapportini || [])].sort((a, b) => (b.data as Timestamp).toMillis() - (a.data as Timestamp).toMillis());
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
          '& .MuiDataGride-row:hover': {
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
