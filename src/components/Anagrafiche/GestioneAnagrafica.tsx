
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRowModel,
  GridActionsCellItem,
  GridRowModesModel,
  GridRowModes,
  GridToolbar,
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

import { useGlobalStore } from '@/stores/globalStore';
import { Anagrafica, AnagraficaKey } from '@/models/definitions';
import { api } from '@/services/api';
import { syncAnagrafiche } from '@/services/SyncService';
import { anagraficheConfig, AnagraficaConfig } from '@/config/anagrafiche.config';
import AnagraficaForm from './AnagraficaForm';

// --- COMPONENTE INTERNO CON LA LOGICA E GLI HOOKS ---
interface AnagraficaGridProps {
  anagraficaType: AnagraficaKey;
  config: AnagraficaConfig;
}

const AnagraficaGrid: React.FC<AnagraficaGridProps> = ({ anagraficaType, config }) => {
  const data = useGlobalStore((state) => state[config.collectionName as keyof typeof state]) as Anagrafica[];
  const isLoading = useGlobalStore((state) => state.areAnagraficheLoading);
  const allData = useGlobalStore((state) => state);

  const [rows, setRows] = useState<Anagrafica[]>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(data || []);
  }, [data]);

  const { columns, fields } = useMemo(() => {
    if (!config.relations) {
      return { columns: config.columns, fields: config.fields };
    }
    const newColumns = [...config.columns];
    const newFields = [...config.fields];
    Object.keys(config.relations).forEach((field) => {
      const relation = config.relations![field];
      const relationData = allData[relation.collection as keyof typeof allData] as Anagrafica[];
      if (!relationData) return;
      const relationMap = new Map(relationData.map((item) => [item.id, item[relation.displayField] as string]));
      const valueOptions = relationData.map((item) => ({ value: item.id, label: item[relation.displayField] as string }));
      
      const colIndex = newColumns.findIndex((col) => col.field === field);
      if (colIndex !== -1) {
        newColumns[colIndex] = { ...newColumns[colIndex], valueOptions, valueFormatter: (value: string) => relationMap.get(value) || value };
      }
      
      const fieldIndex = newFields.findIndex((f) => f.name === field);
      if (fieldIndex !== -1) {
        newFields[fieldIndex] = { ...newFields[fieldIndex], options: valueOptions };
      }
    });
    return { columns: newColumns, fields: newFields };
  }, [config, allData]);
    
  const handleRowEditStart = () => {};
  const handleRowEditStop = () => {};

  const handleEditClick = useCallback((id: string) => () => {
    setRowModesModel((prevModel) => ({ ...prevModel, [id]: { mode: GridRowModes.Edit } }));
  }, []);

  const handleSaveClick = useCallback((id: string) => () => {
    setRowModesModel((prevModel) => ({ ...prevModel, [id]: { mode: GridRowModes.View } }));
  }, []);
  
  const handleCancelClick = useCallback((id: string) => () => {
    setRowModesModel((prevModel) => ({
      ...prevModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    }));
    const editedRow = rows.find((row) => row.id === id);
    if ((editedRow as any)?.isNew) {
      setRows((prevRows) => prevRows.filter((row) => row.id !== id));
    }
  }, [rows]);

  const processRowUpdate = useCallback(async (newRow: GridRowModel<Anagrafica>) => {
    try {
      setError(null);
      const updatedRow = await api.generic.update(config.collectionName, newRow.id, newRow as Partial<Anagrafica>);
      await syncAnagrafiche();
      return updatedRow;
    } catch (err) {
      const newError = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Salvataggio fallito: ${newError}`);
      throw new Error(newError);
    }
  }, [config.collectionName]);

  const handleDeleteClick = useCallback((id: string) => async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo elemento?')) return;
    try {
      setError(null);
      await api.generic.delete(config.collectionName, id);
      await syncAnagrafiche();
    } catch (err) {
      const newError = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Eliminazione fallita: ${newError}`);
    }
  }, [config.collectionName]);

  const handleAdd = useCallback(async (newItem: Omit<Anagrafica, 'id'>) => {
    try {
      setError(null);
      await api.generic.create(config.collectionName, newItem);
      await syncAnagrafiche();
    } catch (err) {
      const newError = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Creazione fallita: ${newError}`);
    }
  }, [config.collectionName]);

  const finalColumns: GridColDef[] = useMemo(() => [
    ...columns,
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Azioni',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id as string]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem icon={<SaveIcon />} label="Salva" onClick={handleSaveClick(id as string)} />,
            <GridActionsCellItem icon={<CancelIcon />} label="Annulla" onClick={handleCancelClick(id as string)} />,
          ];
        }
        return [
          <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={handleEditClick(id as string)} />,
          <GridActionsCellItem icon={<DeleteIcon />} label="Elimina" onClick={handleDeleteClick(id as string)} />,
        ];
      },
    },
  ], [rowModesModel, columns, handleSaveClick, handleCancelClick, handleEditClick, handleDeleteClick]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Typography variant="h4" gutterBottom>{config.title}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <AnagraficaForm fields={fields} onSubmit={handleAdd} />
      <Box sx={{ flex: 1, width: '100%', mt: 2 }}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <DataGrid
            rows={rows}
            columns={finalColumns}
            editMode="row"
            rowModesModel={rowModesModel}
            onRowModesModelChange={setRowModesModel}
            onRowEditStart={handleRowEditStart}
            onRowEditStop={handleRowEditStop}
            processRowUpdate={processRowUpdate}
            onProcessRowUpdateError={(err) => setError(`Update Error: ${String(err)}`)}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: { showQuickFilter: true },
            }}
            density="compact"
          />
        )}
      </Box>
    </Box>
  );
};


// --- COMPONENTE WRAPPER CHE GESTISCE LA CONFIGURAZIONE ---
interface GestioneAnagraficaProps {
  anagraficaType: AnagraficaKey;
}

const GestioneAnagrafica: React.FC<GestioneAnagraficaProps> = ({ anagraficaType }) => {
  const config = anagraficheConfig[anagraficaType];

  if (!config) {
    console.error(`Configurazione non trovata per l'anagrafica: ${anagraficaType}`);
    return <Alert severity="error">Errore di configurazione: anagrafica "{anagraficaType}" non trovata.</Alert>;
  }

  // Renderizza il componente con la logica solo se la config esiste
  return (
      <Box sx={{height: 'calc(100vh - 120px)', p: 1}}>
        <AnagraficaGrid anagraficaType={anagraficaType} config={config} />
      </Box>
  );
};

export default GestioneAnagrafica;
