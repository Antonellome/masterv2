import React from 'react';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { Box, Chip, Link, Typography, Tooltip } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';
import type { Veicolo } from '@/models/definitions';

interface VeicoliListProps {
    veicoli: Veicolo[];
    onEdit: (veicolo: Veicolo) => void;
    onDelete: (id: string) => void;
    onViewDetails: (veicolo: Veicolo) => void;
}

// Funzioni helper riutilizzabili
const toDayjs = (date: string | Timestamp | null | undefined): dayjs.Dayjs | null => {
  if (!date) return null;
  if (date instanceof Timestamp) return dayjs(date.toDate());
  return dayjs(date);
};

const getStatusColor = (date: dayjs.Dayjs | null): 'error' | 'warning' | 'default' => {
    if (!date) return 'default';
    const diff = date.diff(dayjs(), 'day');
    if (diff < 0) return 'error'; // Scaduto
    if (diff <= 30) return 'warning'; // In scadenza
    return 'default';
};

const RenderScadenzaChip = ({ label, date }: { label: string, date: string | Timestamp | null | undefined }) => {
    const dayjsDate = toDayjs(date);
    if (!dayjsDate) return null;
    return (
        <Tooltip title={`${label}: ${dayjsDate.format('DD/MM/YYYY')}`}>
            <Chip 
                label={`${label.substring(0,4)}: ${dayjsDate.format('DD/YY')}`}
                color={getStatusColor(dayjsDate)} 
                size="small" 
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
            />
        </Tooltip>
    );
}

const VeicoliList: React.FC<VeicoliListProps> = ({ veicoli, onEdit, onDelete, onViewDetails }) => {

    const columns: GridColDef[] = [
        {
            field: 'veicolo',
            headerName: 'Veicolo',
            flex: 1,
            minWidth: 180,
            renderCell: (params) => (
                <Box>
                    <Typography variant="body2" fontWeight="bold">{params.row.marca} {params.row.modello}</Typography>
                    <Typography variant="caption" color="text.secondary">{params.row.tipo} ({params.row.anno})</Typography>
                </Box>
            )
        },
        {
            field: 'targa',
            headerName: 'Targa',
            width: 120,
            renderCell: (params) => (
                 <Link component="button" variant="body2" onClick={() => onViewDetails(params.row as Veicolo)} sx={{ textAlign: 'left', fontWeight: 'bold' }}>
                    {params.value}
                </Link>
            )
        },
        {
            field: 'scadenze',
            headerName: 'Scadenza',
            flex: 2,
            minWidth: 350,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', py: 1 }}>
                    <RenderScadenzaChip label="Assicurazione" date={params.row.scadenzaAssicurazione} />
                    <RenderScadenzaChip label="Bollo" date={params.row.scadenzaBollo} />
                    <RenderScadenzaChip label="Revisione" date={params.row.scadenzaRevisione} />
                    <RenderScadenzaChip label="Tagliando" date={params.row.scadenzaTagliando} />
                    <RenderScadenzaChip label="Tachigrafo" date={params.row.scadenzaTachimetro} />
                </Box>
            )
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id, row }) => {
                return [
                    <GridActionsCellItem
                        key={`edit-${id}`}
                        icon={<Edit />}
                        label="Modifica"
                        onClick={() => onEdit(row as Veicolo)}
                        color="primary"
                    />,
                    <GridActionsCellItem
                        key={`delete-${id}`}
                        icon={<Delete />}
                        label="Elimina"
                        onClick={() => onDelete(id as string)}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    return (
        <Box sx={{ height: 'calc(100vh - 220px)', width: '100%' }}>
            <DataGrid
                rows={veicoli || []}
                columns={columns}
                autoHeight
                getRowId={(row) => row.id}
                getRowHeight={() => 'auto'}
                localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                sx={{ '& .MuiDataGrid-cell': { py: 1.5 } }}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 25 },
                    },
                    sorting: {
                        sortModel: [{ field: 'veicolo', sort: 'asc' }],
                    }
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                slots={{ toolbar: GridToolbar }}
                disableRowSelectionOnClick
            />
        </Box>
    );
};

export default VeicoliList;
