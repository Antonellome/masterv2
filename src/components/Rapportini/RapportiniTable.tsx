
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Box, Typography, Alert, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridSlots } from '@mui/x-data-grid';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import { Timestamp } from 'firebase/firestore';
// AGGIORNAMENTO: Usiamo il nuovo hook del context refattorizzato
import { useAnagraficaData } from '@/contexts/DataContext'; 
import type { Rapportino } from '@/models/definitions';
import dayjs from 'dayjs';
import RapportinoView from '@/components/Rapportini/RapportinoView';
import { useReactToPrint } from 'react-to-print';
// AGGIORNAMENTO: Importiamo il servizio per l'eliminazione
import { deleteRapportino } from '@/services/rapportiniService';
import CustomGridOverlay from '@/components/CustomGridOverlay';

interface RapportiniTableProps {
  rapportini: Rapportino[]; // Riceve i rapportini come prop
  loading: boolean; // Riceve lo stato di caricamento
  onEdit: (rapportino: Rapportino) => void;
}

const RapportiniTable: React.FC<RapportiniTableProps> = ({ rapportini, loading, onEdit }) => {
  
  // Usiamo il context solo per ottenere le mappe delle anagrafiche
  const { tecniciMap, naviMap, luoghiMap, tipiGiornataMap, error } = useAnagraficaData();
  
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const componentToPrintRef = useRef(null);
  const handlePrint = useReactToPrint({ content: () => componentToPrintRef.current });

  // Usiamo useRef per l'onEdit per evitare ricreazioni delle colonne
  const onEditRef = useRef(onEdit);
  useEffect(() => { onEditRef.current = onEdit; }, [onEdit]);

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
      try {
        await deleteRapportino(id);
        // La UI si aggiornerà automaticamente grazie alla natura reattiva di Dexie
      } catch (err) {
        console.error("Errore durante l'eliminazione:", err);
        alert("Impossibile eliminare il rapportino.");
      }
    }
  }, []);

  const getTecniciNomi = useCallback((rapportino: Rapportino): string => {
    if (!rapportino.presenze || rapportino.presenze.length === 0) return 'N/D';
    return Array.from(new Set(
        rapportino.presenze.map(id => tecniciMap[id] ? `${tecniciMap[id].nome} ${tecniciMap[id].cognome}` : 'ID Sconosciuto')
    )).join(', ');
  }, [tecniciMap]);

  const columns: GridColDef[] = useMemo(() => [
    { field: 'dataInizio', headerName: 'Data', width: 120, valueFormatter: params => params.value ? dayjs((params.value as Timestamp).toDate()).format('DD/MM/YYYY') : 'N/D' },
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
    {
      field: 'tipoGiornataId',
      headerName: 'Tipo Giornata',
      flex: 1,
      minWidth: 150,
      valueGetter: ({ value }) => (tipiGiornataMap && value ? tipiGiornataMap[value]?.nome : 'N/D'),
    },
    { field: 'naveId', headerName: 'Nave', flex: 1, minWidth: 150, valueGetter: ({ value }) => (naviMap && value ? naviMap[value]?.nome : 'N/D') },
    { field: 'luogoId', headerName: 'Luogo', flex: 1, minWidth: 150, valueGetter: ({ value }) => (luoghiMap && value ? luoghiMap[value]?.nome : 'N/D') },
    {
      field: 'actions',
      headerName: 'Azioni',
      align: 'right', headerAlign: 'right',
      width: 130, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
            <Tooltip title="Vedi Dettagli"><IconButton onClick={() => handleOpenView(params.row as Rapportino)} size="small"><Visibility /></IconButton></Tooltip>
            <Tooltip title="Modifica"><IconButton onClick={() => onEditRef.current(params.row as Rapportino)} size="small"><Edit /></IconButton></Tooltip>
            <Tooltip title="Elimina"><IconButton onClick={() => handleDelete(params.row.id as string)} size="small"><Delete /></IconButton></Tooltip>
        </Box>
      ),
    },
  ], [getTecniciNomi, naviMap, luoghiMap, tipiGiornataMap, handleOpenView, handleDelete]);

  const sortedRapportini = useMemo(() => {
      if (!rapportini) return [];
      // Ordiniamo i dati ricevuti come prop
      return [...rapportini].sort((a, b) => {
          const dateA = a.dataInizio as Timestamp;
          const dateB = b.dataInizio as Timestamp;
          return (dateB?.toMillis() || 0) - (dateA?.toMillis() || 0);
      });
  }, [rapportini]);

  if (error) {
    return <Alert severity="error">Errore nel caricamento delle anagrafiche: {error.message || 'Errore sconosciuto'}</Alert>;
  }

  return (
    <Box sx={{ height: 650, width: '100%' }}>
       <DataGrid
        rows={sortedRapportini}
        columns={columns}
        loading={loading}
        rowHeight={48}
        onRowClick={(params) => handleOpenView(params.row as Rapportino)}
        density="compact"
        slots={{
          loadingOverlay: () => <CustomGridOverlay>Caricamento rapportini...</CustomGridOverlay>,
          noRowsOverlay: () => <CustomGridOverlay>Nessun rapportino trovato</CustomGridOverlay>,
        } as Partial<GridSlots>}
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
