
import type { FormField } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { Chip, Box, Typography, Link } from '@mui/material';
import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';

const toDayjs = (date: string | Timestamp | null | undefined): dayjs.Dayjs | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return dayjs(date.toDate());
    return dayjs(date);
};

const getStatusColor = (date: dayjs.Dayjs | null): 'error' | 'warning' | 'default' => {
    if (!date) return 'default';
    const diff = date.diff(dayjs(), 'day');
    if (diff < 0) return 'error';
    if (diff <= 30) return 'warning';
    return 'default';
};

const RenderScadenzaChip = ({ label, date }: { label: string, date: string | Timestamp | null | undefined }) => {
    const dayjsDate = toDayjs(date);
    if (!dayjsDate) return null;
    return (
        <Chip
            label={`${label.substring(0, 4)}: ${dayjsDate.format('DD/YY')}`}
            color={getStatusColor(dayjsDate)}
            size="small"
            variant="outlined"
            sx={{ mr: 0.5, mb: 0.5 }}
        />
    );
};

export interface AnagraficaConfig {
    title: string;
    collectionName: string;
    fields: FormField[];
    columns: GridColDef[];
    anagraficaType: string;
}

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
                    <Chip
                        label={`€ ${Number(params.value || 0).toFixed(2)} / ora`}
                        color="primary"
                        variant="outlined"
                    />
                ),
            }
        ]
    },
    veicoli: {
        title: 'Gestione Veicoli',
        collectionName: 'veicoli',
        anagraficaType: 'veicolo',
        fields: [
            { name: 'targa', label: 'Targa', type: 'text', required: true, gridProps: { size: { xs: 12, sm: 4 } } },
            { name: 'tipo', label: 'Tipo', type: 'select', options: { items: ['auto', 'furgone', 'camion', 'speciale', 'muletto'] }, gridProps: { size: { xs: 12, sm: 4 } } },
            { name: 'marca', label: 'Marca', type: 'text', gridProps: { size: { xs: 12, sm: 4 } } },
            { name: 'modello', label: 'Modello', type: 'text', gridProps: { size: { xs: 12, sm: 4 } } },
            { name: 'anno', label: 'Anno', type: 'number', gridProps: { size: { xs: 12, sm: 4 } } },
            { name: 'kmAttuali', label: 'Km Attuali', type: 'number', gridProps: { size: { xs: 12, sm: 4 } } },
            { name: 'scadenzaAssicurazione', label: 'Scadenza Assicurazione', type: 'date', gridProps: { size: { xs: 12, sm: 6 } } },
            { name: 'scadenzaBollo', label: 'Scadenza Bollo', type: 'date', gridProps: { size: { xs: 12, sm: 6 } } },
            { name: 'scadenzaRevisione', label: 'Scadenza Revisione', type: 'date', gridProps: { size: { xs: 12, sm: 6 } } },
            { name: 'scadenzaTagliando', label: 'Scadenza Tagliando', type: 'date', gridProps: { size: { xs: 12, sm: 6 } } },
            { name: 'scadenzaTachigrafo', label: 'Scadenza Tachigrafo', type: 'date', gridProps: { size: { xs: 12, sm: 6 } } },
            { name: 'note', label: 'Note', type: 'textarea', gridProps: { size: { xs: 12 } } },
            { name: 'attivo', label: 'Veicolo attivo', type: 'boolean', gridProps: { size: { xs: 12 } } },
        ],
        columns: [
            {
                field: 'veicolo',
                headerName: 'Veicolo',
                flex: 1,
                minWidth: 180,
                renderCell: (params) => (
                    <Box>
                        <Typography variant="body2" fontWeight="bold">{`${params.row.marca} ${params.row.modello}`}</Typography>
                        <Typography variant="caption" color="text.secondary">{`${params.row.tipo} (${params.row.anno})`}</Typography>
                    </Box>
                )
            },
            {
                field: 'targa',
                headerName: 'Targa',
                width: 120,
                renderCell: (params) => (
                     <Link component="button" variant="body2" onClick={() => console.log('details')} sx={{ textAlign: 'left', fontWeight: 'bold' }}>{params.value}</Link>
                )
            },
            {
                field: 'scadenze',
                headerName: 'Scadenze',
                flex: 2,
                minWidth: 350,
                sortable: false,
                renderCell: (params) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', py: 1 }}>
                        <RenderScadenzaChip key="assicurazione" label="Assicurazione" date={params.row.scadenzaAssicurazione} />
                        <RenderScadenzaChip key="bollo" label="Bollo" date={params.row.scadenzaBollo} />
                        <RenderScadenzaChip key="revisione" label="Revisione" date={params.row.scadenzaRevisione} />
                        <RenderScadenzaChip key="tagliando" label="Tagliando" date={params.row.scadenzaTagliando} />
                        <RenderScadenzaChip key="tachigrafo" label="Tachigrafo" date={params.row.scadenzaTachigrafo} />
                    </Box>
                )
            },
        ]
    },
};
