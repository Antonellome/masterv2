
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { AnagraficaConfig } from '@/models/definitions';
import { Box } from '@mui/material';

export const anagraficheConfig: AnagraficaConfig = {
    clienti: {
        collectionName: 'clienti',
        title: 'Clienti',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
            { name: 'email', label: 'Email', type: 'email' },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
            { field: 'indirizzo', headerName: 'Indirizzo', flex: 2, editable: true },
            { field: 'email', headerName: 'Email', flex: 1, editable: true },
        ],
    },
    navi: {
        collectionName: 'navi',
        title: 'Navi',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'clienteId', label: 'Cliente', type: 'select', required: true, options: [] },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
            { field: 'clienteId', headerName: 'Cliente', flex: 1, editable: true, type: 'singleSelect', valueOptions: [] },
        ],
        relations: {
            clienteId: { collection: 'clienti', displayField: 'nome' }
        }
    },
    luoghi: {
        collectionName: 'luoghi',
        title: 'Luoghi',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        ],
    },
    ditte: {
        collectionName: 'ditte',
        title: 'Ditte',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        ],
    },
    categorie: {
        collectionName: 'categorie',
        title: 'Categorie',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'descrizione', label: 'Descrizione', type: 'text' },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
            { field: 'descrizione', headerName: 'Descrizione', flex: 2, editable: true },
        ],
    },
    veicoli: {
        collectionName: 'veicoli',
        title: 'Veicoli',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'targa', label: 'Targa', type: 'text' },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
            { field: 'targa', headerName: 'Targa', flex: 1, editable: true },
        ],
    },
    tipiGiornata: {
        collectionName: 'tipiGiornata',
        title: 'Tipi Giornata',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'costoOrario', label: 'Costo Orario (€)', type: 'number' },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
            {
                field: 'costoOrario',
                headerName: 'Costo Orario',
                flex: 1,
                editable: true,
                type: 'number',
                valueFormatter: (value: number | undefined) => value != null ? `€ ${value}` : ''
            },
        ],
    },
};
