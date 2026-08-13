
import { GridColDef } from '@mui/x-data-grid';
import { AnagraficaConfig } from '@/models/definitions';

export const anagraficheConfig: AnagraficaConfig = {
    clienti: {
        collectionName: 'clienti',
        title: 'Clienti',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'piva', label: 'Partita IVA', type: 'text' },
            { name: 'codiceFiscale', label: 'Codice Fiscale', type: 'text' },
            { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
            { name: 'citta', label: 'Città', type: 'text' },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'telefono', label: 'Telefono', type: 'text' },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
            { field: 'piva', headerName: 'P. IVA', flex: 1, editable: true },
            { field: 'indirizzo', headerName: 'Indirizzo', flex: 2, editable: true },
            { field: 'email', headerName: 'Email', flex: 1, editable: true },
            { field: 'telefono', headerName: 'Telefono', flex: 1, editable: true },
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
            { name: 'clienteId', label: 'Cliente', type: 'select', options: [] },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
            { field: 'clienteId', headerName: 'Cliente', flex: 1, editable: true, type: 'singleSelect', valueOptions: [] },
        ],
        relations: {
            clienteId: { collection: 'clienti', displayField: 'nome' }
        }
    },
    ditte: {
        collectionName: 'ditte',
        title: 'Ditte',
        fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'piva', label: 'Partita IVA', type: 'text' },
            { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'telefono', label: 'Telefono', type: 'text' },
        ],
        columns: [
            { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
            { field: 'piva', headerName: 'P. IVA', flex: 1, editable: true },
            { field: 'indirizzo', headerName: 'Indirizzo', flex: 2, editable: true },
            { field: 'email', headerName: 'Email', flex: 1, editable: true },
            { field: 'telefono', headerName: 'Telefono', flex: 1, editable: true },
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
            { name: 'marca', label: 'Marca', type: 'text', required: true },
            { name: 'modello', label: 'Modello', type: 'text', required: true },
            { name: 'targa', label: 'Targa', type: 'text', required: true },
            { name: 'tipo', label: 'Tipo', type: 'text' },
            { name: 'anno', label: 'Anno', type: 'text' },
            { name: 'kmAttuali', label: 'Km Attuali', type: 'text' },
            { name: 'scadenzaBollo', label: 'Scadenza Bollo', type: 'date' },
            { name: 'scadenzaAssicurazione', label: 'Scadenza Assicurazione', type: 'date' },
            { name: 'scadenzaRevisione', label: 'Scadenza Revisione', type: 'date' },
            { name: 'scadenzaTagliando', label: 'Scadenza Tagliando', type: 'date' },
            { name: 'scadenzaTachigrafo', label: 'Scadenza Tachigrafo', type: 'date' },
            { name: 'note', label: 'Note', type: 'text' },
        ],
        columns: [
            { field: 'marca', headerName: 'Marca', flex: 1, editable: true },
            { field: 'modello', headerName: 'Modello', flex: 1, editable: true },
            { field: 'targa', headerName: 'Targa', flex: 1, editable: true },
            { field: 'tipo', headerName: 'Tipo', flex: 1, editable: true },
            { field: 'kmAttuali', headerName: 'Km', flex: 0.5, editable: true },
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
