
import { jsx as _jsx } from "react/jsx-runtime";
import type { FormField } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { Chip } from '@mui/material';

// Definizione del tipo per una singola configurazione di anagrafica
export interface AnagraficaConfig {
  title: string;
  collectionName: string;
  fields: FormField[];
  columns: GridColDef[];
  anagraficaType: string;
}

// Oggetto di configurazione centralizzato
export const anagraficheConfig: Record<string, AnagraficaConfig> = {
  clienti: {
    title: 'Gestione Clienti',
    collectionName: 'clienti',
    anagraficaType: 'cliente',
    fields: [
      { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { size: { xs: 12 } } },
      { name: 'indirizzo', label: 'Indirizzo', type: 'text', gridProps: { size: { xs: 12 } } },
      { name: 'citta', label: 'Città', type: 'text', gridProps: { size: { xs: 12, md: 6 } } },
      { name: 'cap', label: 'CAP', type: 'text', gridProps: { size: { xs: 6, md: 3 } } },
      { name: 'provincia', label: 'Provincia', type: 'text', gridProps: { size: { xs: 6, md: 3 } } },
      { name: 'partitaIva', label: 'Partita IVA', type: 'text', gridProps: { size: { xs: 12, md: 6 } } },
      { name: 'codiceFiscale', label: 'Codice Fiscale', type: 'text', gridProps: { size: { xs: 12, md: 6 } } },
      { name: 'email', label: 'Email', type: 'email', gridProps: { size: { xs: 12, md: 6 } } },
      { name: 'telefono', label: 'Telefono', type: 'text', gridProps: { size: { xs: 12, md: 6 } } },
    ],
    columns: [
      { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
      {
          field: 'numNavi',
          headerName: 'N. Navi',
          type: 'number',
          width: 90,
          align: 'center',
          headerAlign: 'center'
      },
      {
          field: 'numLuoghi',
          headerName: 'N. Luoghi',
          type: 'number',
          width: 90,
          align: 'center',
          headerAlign: 'center'
      },
      { field: 'citta', headerName: 'Città', flex: 1, minWidth: 120, editable: true },
      { field: 'partitaIva', headerName: 'Partita IVA', flex: 1, minWidth: 120, editable: true },
    ]
  },
  navi: {
    title: 'Gestione Navi',
    collectionName: 'navi',
    anagraficaType: 'nave',
    fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { size: { xs: 12 } } },
        {
            name: 'clienteId',
            label: 'Cliente',
            type: 'select',
            required: true,
            gridProps: { size: { xs: 12 } },
            options: {
                collectionName: 'clienti',
                labelField: 'nome',
                valueField: 'id'
            }
        },
    ],
    columns: [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
        {
            field: 'clienteId',
            headerName: 'Cliente',
            flex: 1,
            minWidth: 150,
            editable: true,
            type: 'singleSelect',
        },
    ]
  },
  luoghi: {
    title: 'Gestione Luoghi',
    collectionName: 'luoghi',
    anagraficaType: 'luogo',
    fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { size: { xs: 12 } } },
        {
            name: 'clienteId',
            label: 'Cliente',
            type: 'select',
            gridProps: { size: { xs: 12 } },
            options: {
                collectionName: 'clienti',
                labelField: 'nome',
                valueField: 'id'
            }
        },
    ],
    columns: [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
        {
            field: 'clienteId',
            headerName: 'Cliente',
            flex: 1,
            minWidth: 150,
            editable: true,
            type: 'singleSelect',
        },
    ]
  },
  ditte: {
    title: 'Gestione Ditte',
    collectionName: 'ditte',
    anagraficaType: 'ditta',
    fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { size: { xs: 12 } } },
    ],
    columns: [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
    ]
  },
  categorie: {
    title: 'Gestione Categorie',
    collectionName: 'categorie',
    anagraficaType: 'categoria',
    fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { size: { xs: 12 } } },
    ],
    columns: [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
    ]
  },
  tipiGiornata: {
    title: 'Gestione Tipi Giornata',
    collectionName: 'tipiGiornata',
    anagraficaType: 'tipoGiornata',
    fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { size: { xs: 12, md: 6 } } },
        { name: 'costoOrario', label: 'Costo Orario (€)', type: 'number', required: true, gridProps: { size: { xs: 12, md: 6 } } },
    ],
    columns: [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
        {
            field: 'costoOrario',
            headerName: 'Costo Orario',
            type: 'number',
            flex: 1,
            minWidth: 120,
            editable: true,
            renderCell: (params) => (
                _jsx(Chip, {
                    label: `€ ${Number(params.value || 0).toFixed(2)} / ora`,
                    color: "primary",
                    variant: "outlined"
                })
            ),
        }
    ]
  },
  // Aggiungeremo qui le altre configurazioni
};
