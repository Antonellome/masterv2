
import React from 'react';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { AnagraficaKey, FormField } from '@/models/definitions';

// Interfaccia per la configurazione di una singola anagrafica
export interface AnagraficaConfig {
  collectionName: AnagraficaKey;
  title: string;
  fields: FormField[];
  columns: GridColDef[];
  // NUOVO CAMPO: Specifica il nome del campo timestamp per la sincronizzazione.
  // Se non definito, il default è 'updatedAt'.
  // Se null, la sincronizzazione sarà sempre completa per questa tabella.
  timestampField?: string | null;
  relations?: {
    [field: string]: {
      collection: AnagraficaKey;
      displayField: string;
    };
  };
}

// Oggetto di configurazione principale, ora con la gestione dei timestamp
export const anagraficheConfig: Record<AnagraficaKey, AnagraficaConfig> = {
  clienti: {
    collectionName: 'clienti',
    title: 'Clienti',
    timestampField: 'updatedAt', // Default esplicito
    fields: [
      { name: 'nome', label: 'Nome Cliente', type: 'text', required: true },
      { name: 'piva', label: 'Partita IVA', type: 'text' },
      { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
    ],
    columns: [
      { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
      { field: 'piva', headerName: 'P.IVA', flex: 1, editable: true },
      { field: 'indirizzo', headerName: 'Indirizzo', flex: 2, editable: true },
      { field: 'email', headerName: 'Email', flex: 1, editable: true },
    ],
  },
  navi: {
    collectionName: 'navi',
    title: 'Navi',
    timestampField: 'updatedAt',
    fields: [
      { name: 'nome', label: 'Nome Nave', type: 'text', required: true },
      { name: 'clienteId', label: 'Cliente', type: 'select', required: true },
    ],
    columns: [
      { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
      { field: 'clienteId', headerName: 'Cliente', flex: 1.5, editable: true, type: 'singleSelect' },
    ],
    relations: {
      clienteId: {
        collection: 'clienti',
        displayField: 'nome',
      },
    },
  },
   luoghi: {
    collectionName: 'luoghi',
    title: 'Luoghi',
    timestampField: 'updatedAt',
    fields: [
        { name: 'nome', label: 'Nome Luogo', type: 'text', required: true },
        { name: 'clienteId', label: 'Cliente', type: 'select', required: false },
    ],
    columns: [
        { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        { field: 'clienteId', headerName: 'Cliente', flex: 1.5, editable: true, type: 'singleSelect' },
    ],
    relations: {
      clienteId: {
        collection: 'clienti',
        displayField: 'nome',
      },
    },
  },
  veicoli: {
    collectionName: 'veicoli',
    title: 'Veicoli',
    timestampField: 'updatedAt',
    fields: [
      { name: 'targa', label: 'Targa', type: 'text', required: true },
      { name: 'marca', label: 'Marca', type: 'text' },
      { name: 'modello', label: 'Modello', type: 'text' },
      { name: 'tipo', label: 'Tipo', type: 'text' },
      { name: 'attivo', label: 'Attivo', type: 'boolean' },
    ],
    columns: [
      { field: 'targa', headerName: 'Targa', flex: 1, editable: true },
      { field: 'marca', headerName: 'Marca', flex: 1, editable: true },
      { field: 'modello', headerName: 'Modello', flex: 1, editable: true },
      { field: 'tipo', headerName: 'Tipo', flex: 1, editable: true },
      { field: 'attivo', headerName: 'Attivo', flex: 0.5, type: 'boolean', editable: true },
    ],
  },
  tipiGiornata: {
    collectionName: 'tipiGiornata',
    title: 'Tipi Giornata',
    timestampField: null, // <-- FORZO IL FULL-SYNC. PROBLEMA RISOLTO.
    fields: [
      { name: 'nome', label: 'Nome', type: 'text', required: true },
      { name: 'colore', label: 'Colore', type: 'color', required: true },
      { name: 'costoOrario', label: 'Costo Orario (€)', type: 'number' },
    ],
    columns: [
      { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
      {
          field: 'colore',
          headerName: 'Colore',
          width: 120,
          renderCell: (params: GridRenderCellParams<string>) => (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: params.value, border: '1px solid #ccc', mr: 1 }} />
                  {params.value}
              </Box>
          )
      },
      {
          field: 'costoOrario',
          headerName: 'Costo Orario',
          flex: 1,
          editable: true,
          type: 'number',
          valueFormatter: (value: number | undefined) => value != null ? `€ ${value}` : ''
      },
    ]
  },
  ditte: {
    collectionName: 'ditte',
    title: 'Ditte',
    timestampField: 'updatedAt',
    fields: [
        { name: 'nome', label: 'Nome Ditta', type: 'text', required: true },
        { name: 'piva', label: 'Partita IVA', type: 'text' },
        { name: 'cf', label: 'Codice Fiscale', type: 'text' },
        { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
        { name: 'cap', label: 'CAP', type: 'text' },
        { name: 'citta', label: 'Città', type: 'text' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'telefono', label: 'Telefono', type: 'text' },
    ],
    columns: [
        { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        { field: 'piva', headerName: 'P.IVA', flex: 1, editable: true },
        { field: 'cf', headerName: 'C.F.', flex: 1, editable: true },
        { field: 'indirizzo', headerName: 'Indirizzo', flex: 1.5, editable: true },
        { field: 'citta', headerName: 'Città', flex: 1, editable: true },
        { field: 'email', headerName: 'Email', flex: 1, editable: true },
        { field: 'telefono', headerName: 'Telefono', flex: 1, editable: true },
    ]
  },
  categorie: {
      collectionName: 'categorie',
      title: 'Categorie',
      timestampField: null, // <-- SPECIFICO CHE NON HA TIMESTAMP (forza full sync)
      fields: [{ name: 'nome', label: 'Nome Categoria', type: 'text', required: true }],
      columns: [{ field: 'nome', headerName: 'Nome', flex: 1, editable: true }],
  }
};
