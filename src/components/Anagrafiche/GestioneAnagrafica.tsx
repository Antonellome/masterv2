import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import {
  DataGrid, GridColDef, GridRowModel, GridActionsCellItem, GridRowModesModel, GridRowModes, GridToolbar
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Anagrafica } from '@/models/definitions';
import { anagraficheConfig, AnagraficaConfig, AnagraficaKey } from '@/config/anagrafiche.config';
import { logger } from '@/utils/logger';
import AnagraficaForm from './AnagraficaForm';

// TODO: Implementare le chiamate alle Cloud Functions per create, update, delete.
const handleCloudSync = async (operation: 'create' | 'update' | 'delete', collectionName: string, data: any) => {
  logger.log(`[Cloud Sync] ${operation} su ${collectionName}:`, data);
  // Qui andrà la logica per chiamare la Cloud Function
  // Esempio: const { data: result } = await httpsCallable(functions, 'updateAnagrafica')(data);
  return Promise.resolve(); // Simula una chiamata asincrona
};

interface AnagraficaGridProps {
  anagraficaType: AnagraficaKey;
  config: AnagraficaConfig;
}

const AnagraficaGrid: React.FC<AnagraficaGridProps> = ({ anagraficaType, config }) => {
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [error, setError] = useState<string | null>(null);

  // 1. Lettura reattiva dei dati da Dexie
  const rows = useLiveQuery(() => 
    (db as any)[config.collectionName].toArray()
  , [], []);

  // 2. Gestione reattiva delle relazioni per le colonne
  const finalColumns = useMemo(() => {
    const resolvedColumns = [...config.columns];
    if (config.relations) {
      Object.keys(config.relations).forEach(field => {
        const relation = config.relations![field];
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const relationData = useLiveQuery(() => (db as any)[relation.collection].toArray(), []);
        
        if (relationData) {
          const relationMap = new Map(relationData.map((item) => [item.id, item[relation.displayField] as string]));
          const valueOptions = relationData.map((item) => ({ value: item.id, label: item[relation.displayField] as string }));
          
          const colIndex = resolvedColumns.findIndex((col) => col.field === field);
          if (colIndex !== -1) {
            resolvedColumns[colIndex] = {
              ...resolvedColumns[colIndex],
              valueOptions,
              valueFormatter: (value: string) => relationMap.get(value) || value
            };
          }
        }
      });
    }

    // Aggiunge la colonna delle azioni
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
      }
    ];
  }, [config, rowModesModel]);

  // 3. Operazioni CRUD che modificano Dexie e poi (TODO) sincronizzano col cloud

  const processRowUpdate = useCallback(async (newRow: GridRowModel<Anagrafica>) => {
    try {
      setError(null);
      const table = (db as any)[config.collectionName];
      await table.update(newRow.id, newRow);
      await handleCloudSync('update', config.collectionName, newRow);
      logger.log(`[Dexie] Aggiornato ${config.collectionName} con id ${newRow.id}`);
      return newRow;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Salvataggio fallito: ${errorMsg}`);
      logger.error(`[Dexie] Errore aggiornamento ${config.collectionName}:`, err);
      throw new Error(errorMsg);
    }
  }, [config.collectionName]);

  const handleDelete = useCallback((id: string) => async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo elemento?')) return;
    try {
      setError(null);
      const table = (db as any)[config.collectionName];
      await table.delete(id);
      await handleCloudSync('delete', config.collectionName, { id });
      logger.log(`[Dexie] Eliminato ${config.collectionName} con id ${id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Eliminazione fallita: ${errorMsg}`);
      logger.error(`[Dexie] Errore eliminazione ${config.collectionName}:`, err);
    }
  }, [config.collectionName]);

  const handleAdd = useCallback(async (newItem: Omit<Anagrafica, 'id'>) => {
    try {
        setError(null);
        const table = (db as any)[config.collectionName];
        // Dexie si aspetta l'id per 'add', ma Firestore lo genera.
        // Per ora, usiamo un ID temporaneo se necessario o lo omettiamo se la tabella ha `++id`.
        const itemToAdd = { ...newItem, id: newItem.id || crypto.randomUUID() };
        await table.add(itemToAdd);
        await handleCloudSync('create', config.collectionName, itemToAdd);
        logger.log(`[Dexie] Aggiunto nuovo elemento a ${config.collectionName}`);
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
        setError(`Creazione fallita: ${errorMsg}`);
        logger.error(`[Dexie] Errore creazione ${config.collectionName}:`, err);
    }
  }, [config.collectionName]);

  // La gestione dei campi per il form rimane la stessa, ma potrebbe beneficiare delle relazioni caricate
  const formFields = useMemo(() => {
    const newFields = [...config.fields];
      if (config.relations) {
        Object.keys(config.relations).forEach(field => {
           // eslint-disable-next-line react-hooks/rules-of-hooks
           const relationData = useLiveQuery(() => (db as any)[config.relations![field].collection].toArray());
           if(relationData) {
              const fieldIndex = newFields.findIndex((f) => f.name === field);
              if (fieldIndex !== -1) {
                 newFields[fieldIndex] = {
                    ...newFields[fieldIndex],
                    options: relationData.map(item => ({value: item.id, label: item.nome}))
                 };
              }
           }
        });
    }
    return newFields;
  }, [config.fields, config.relations]);


  if (!rows) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Typography variant="h4" gutterBottom>{config.title}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <AnagraficaForm fields={formFields} onSubmit={handleAdd} />
      <Box sx={{ flex: 1, width: '100%', mt: 2 }}>
        <DataGrid
          rows={rows}
          columns={finalColumns}
          getRowId={(row) => row.id} // Assicura che DataGrid usi il nostro ID
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

interface GestioneAnagraficaProps {
  anagraficaType: AnagraficaKey;
}

const GestioneAnagrafica: React.FC<GestioneAnagraficaProps> = ({ anagraficaType }) => {
  const config = anagraficheConfig[anagraficaType];

  if (!config) {
    return <Alert severity="error">Errore di configurazione: anagrafica "{anagraficaType}" non trovata.</Alert>;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', p: 1 }}>
      <AnagraficaGrid anagraficaType={anagraficaType} config={config} />
    </Box>
  );
};

export default GestioneAnagrafica;
