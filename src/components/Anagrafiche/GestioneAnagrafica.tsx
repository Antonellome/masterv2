import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import {
  DataGrid, GridRowModel, GridActionsCellItem, GridRowModesModel, GridRowModes, GridToolbar
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAnagrafiche } from '@/contexts/AnagraficheContext';
import { Anagrafica } from '@/models/definitions';
import { anagraficheConfig, AnagraficaKey } from '@/config/anagrafiche.config';
import { logger } from '@/utils/logger';
import AnagraficaForm from './AnagraficaForm';
import { anagraficheService } from '@/services/anagraficheService';

interface GestioneAnagraficaProps {
  anagraficaType: AnagraficaKey;
}

const GestioneAnagrafica: React.FC<GestioneAnagraficaProps> = ({ anagraficaType }) => {
  const config = anagraficheConfig[anagraficaType];
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [error, setError] = useState<string | null>(null);

  const { loading, ...anagraficheData } = useAnagrafiche();

  const rows = (anagraficheData as any)[anagraficaType] || [];

  const finalColumns = useMemo(() => {
    if (!config) return [];

    const resolvedColumns = [...config.columns];

    if (config.relations) {
      Object.keys(config.relations).forEach(field => {
        const relation = config.relations![field];
        const relationData = (anagraficheData as any)[relation.collection] || [];
        const relationMap = new Map(relationData.map((item: any) => [item.id, item[relation.displayField]]));
        const relationOptions = relationData.map((item: any) => ({ value: item.id, label: item[relation.displayField] }));

        const colIndex = resolvedColumns.findIndex((col) => col.field === field);
        if (colIndex !== -1) {
          resolvedColumns[colIndex] = {
            ...resolvedColumns[colIndex],
            valueOptions: relationOptions,
            valueFormatter: (value: string) => relationMap.get(value) || value,
          };
        }
      });
    }

    return [...resolvedColumns, {
      field: 'actions', type: 'actions', headerName: 'Azioni', width: 100, cellClassName: 'actions',
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem icon={<SaveIcon />} label="Salva" onClick={() => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } })} />,
            <GridActionsCellItem icon={<CancelIcon />} label="Annulla" onClick={() => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View, ignoreModifications: true } })} />,
          ];
        }
        return [
          <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={() => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } })} />,
          <GridActionsCellItem icon={<DeleteIcon />} label="Elimina" onClick={handleDelete(id as string)} />,
        ];
      },
    }];
  }, [config, rowModesModel, anagraficheData]);

  const formFields = useMemo(() => {
    if (!config) return [];

    const newFields = [...config.fields];
    if (config.relations) {
        Object.keys(config.relations).forEach(field => {
            const relation = config.relations![field];
            const relationData = (anagraficheData as any)[relation.collection] || [];
            const relationOptions = relationData.map((item: any) => ({ value: item.id, label: item[relation.displayField] }));

            const fieldIndex = newFields.findIndex((f) => f.name === field);
            if (fieldIndex !== -1) {
                newFields[fieldIndex] = {
                    ...newFields[fieldIndex],
                    options: relationOptions,
                };
            }
        });
    }
    return newFields;
}, [config, anagraficheData]);


  const processRowUpdate = useCallback(async (newRow: GridRowModel<Anagrafica>) => {
    try {
      setError(null);
      await anagraficheService(config.collectionName, 'update', newRow);
      logger.log(`[Cloud Sync] Update per ${config.collectionName} id ${newRow.id} completato.`);
      return newRow;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Salvataggio fallito: ${errorMsg}`);
      logger.error(`[Cloud Sync] Errore aggiornamento ${config.collectionName}:`, err);
      throw new Error(errorMsg);
    }
  }, [config.collectionName]);

  const handleDelete = useCallback((id: string) => async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo elemento?')) return;
    try {
      setError(null);
      await anagraficheService(config.collectionName, 'delete', { id });
      logger.log(`[Cloud Sync] Delete per ${config.collectionName} id ${id} completato.`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Eliminazione fallita: ${errorMsg}`);
      logger.error(`[Cloud Sync] Errore eliminazione ${config.collectionName}:`, err);
    }
  }, [config.collectionName]);

  const handleAdd = useCallback(async (newItem: Omit<Anagrafica, 'id'>) => {
    try {
      setError(null);
      const itemToAdd = { ...newItem, id: crypto.randomUUID() };
      await anagraficheService(config.collectionName, 'create', itemToAdd);
      logger.log(`[Cloud Sync] Create per ${config.collectionName} completato.`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Creazione fallita: ${errorMsg}`);
      logger.error(`[Cloud Sync] Errore creazione ${config.collectionName}:`, err);
    }
  }, [config.collectionName]);

  if (loading) {
    return <CircularProgress />;
  }

  if (!config) {
    return <Alert severity="error">Errore di configurazione: anagrafica "{anagraficaType}" non trovata.</Alert>;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', p: 1, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom>{config.title}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <AnagraficaForm fields={formFields} onSubmit={handleAdd} />
      <Box sx={{ flex: 1, width: '100%', mt: 2 }}>
        <DataGrid
          rows={rows}
          columns={finalColumns}
          getRowId={(row) => row.id}
          editMode="row"
          rowModesModel={rowModesModel}
          onRowModesModelChange={setRowModesModel}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={(err) => setError(`Update Error: ${String(err)}`)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          density="compact"
        />
      </Box>
    </Box>
  );
};

export default GestioneAnagrafica;
