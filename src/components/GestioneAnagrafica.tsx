import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useGlobalStore } from '@/stores/globalStore';
import * as api from '@/services/api';

// Definiamo un tipo per i campi del form per maggiore chiarezza
interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
}

interface GestioneAnagraficaProps {
  collectionName: string;
  columns: GridColDef[];
  title: string;
  fields: FormField[]; // Aggiungiamo i campi del form come prop
}

const GestioneAnagrafica: React.FC<GestioneAnagraficaProps> = ({ collectionName, columns, title, fields }) => {
  const data = useGlobalStore((state) => state[collectionName]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Funzione per inizializzare il form
  const getInitialFormData = (rowData = {}) => {
    const initialData = {};
    fields.forEach(field => {
      initialData[field.name] = rowData[field.name] || '';
    });
    return { ...rowData, ...initialData };
  };

  const handleOpenDialog = (rowData = {}) => {
    setFormData(getInitialFormData(rowData));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const dataToSave = { ...formData };
      delete dataToSave.id; // Rimuoviamo l'id per non sovrascriverlo in Firestore

      if (formData.id) {
        await api.updateDocument(collectionName, formData.id, dataToSave);
      } else {
        await api.createDocument(collectionName, dataToSave);
      }
      // TODO: Aggiungere logica di refresh e notifica successo
    } catch (error) {
      console.error('Save failed:', error);
      // TODO: Aggiungere notifica di errore
    }
    setLoading(false);
    handleCloseDialog();
  };
  
  // Aggiungiamo le azioni di modifica ed eliminazione alle colonne
  const actionColumn: GridColDef = {
    field: 'actions',
    headerName: 'Azioni',
    sortable: false,
    renderCell: (params) => (
      <Box>
        <Button onClick={() => handleOpenDialog(params.row)}>Modifica</Button>
        {/* Aggiungere qui il pulsante elimina con conferma */}
      </Box>
    ),
  };

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Button variant="contained" onClick={() => handleOpenDialog()}>Aggiungi {title}</Button>
      <DataGrid
        rows={data || []}
        columns={[...columns, actionColumn]} // Aggiungiamo la colonna azioni
        loading={loading}
        autoHeight
        // Altre props...
      />
      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{formData.id ? 'Modifica' : 'Aggiungi'} {title}</DialogTitle>
        <DialogContent>
          {fields.map((field) => (
            <TextField
              key={field.name}
              autoFocus={fields.indexOf(field) === 0}
              margin="dense"
              name={field.name}
              label={field.label}
              type={field.type}
              required={field.required}
              fullWidth
              variant="standard"
              onChange={handleFormChange}
              value={formData[field.name] || ''}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annulla</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? <CircularProgress size={24} /> : 'Salva'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestioneAnagrafica;
