import React from 'react';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { Box, Chip, Link, Tooltip } from '@mui/material';
import { Edit, Delete, Visibility } from '@mui/icons-material';
import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';
import type { Documento } from '@/models/definitions';

interface DocumentiListProps {
    documenti: Documento[];
    onEdit: (documento: Documento) => void;
    onDelete: (id: string) => void;
    onViewDetails: (documento: Documento) => void;
}

// Definizione di un tipo sicuro per gli input di data
type DateInput = Timestamp | Date | string | null;

// La funzione ora accetta il tipo sicuro e restituisce un oggetto Dayjs o null
const safeFormatDate = (date: DateInput): dayjs.Dayjs | null => {
    if (!date) return null;
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    const dayjsDate = dayjs(dateObj);
    return dayjsDate.isValid() ? dayjsDate : null;
};


// Funzioni helper
const getStatusColor = (date: dayjs.Dayjs | null): 'error' | 'warning' | 'default' => {
    if (!date) return 'default';
    const diff = date.diff(dayjs(), 'day');
    if (diff < 0) return 'error';
    if (diff <= 30) return 'warning';
    return 'default';
};

// Il componente ora usa il tipo DateInput per la sua prop `date`
const RenderScadenzaChip = ({ label, date }: { label: string, date: DateInput }) => {
    const dayjsDate = safeFormatDate(date);
    if (!dayjsDate) return null;

    return (
        <Tooltip title={`${label}: ${dayjsDate.format('DD/MM/YYYY')}`}>
            <Chip 
                label={`${label}: ${dayjsDate.format('DD/MM/YY')}`}
                color={getStatusColor(dayjsDate)} 
                size="small" 
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
            />
        </Tooltip>
    );
};

const DocumentiList: React.FC<DocumentiListProps> = ({ documenti, onEdit, onDelete, onViewDetails }) => {

    const columns: GridColDef<Documento>[] = [
        {
            field: 'nome',
            headerName: 'Nome Documento',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Link component="button" variant="body2" onClick={() => onViewDetails(params.row)} sx={{ textAlign: 'left', fontWeight: 'bold' }}>
                   {params.value}
               </Link>
           )
        },
        {
            field: 'descrizione',
            headerName: 'Descrizione',
            flex: 1.5,
            minWidth: 250,
        },
        {
            field: 'scadenze',
            headerName: 'Scadenze',
            flex: 1,
            minWidth: 220,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                    <RenderScadenzaChip label="Scad. 1" date={params.row.scadenza1} />
                    <RenderScadenzaChip label="Scad. 2" date={params.row.scadenza2} />
                </Box>
            )
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 120,
            cellClassName: 'actions',
            getActions: ({ id, row }) => {
                return [
                    <GridActionsCellItem
                        key={`${id}-view`}
                        icon={<Visibility />}
                        label="Dettagli"
                        onClick={() => onViewDetails(row)}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        key={`${id}-edit`}
                        icon={<Edit />}
                        label="Modifica"
                        onClick={() => onEdit(row)}
                        color="primary"
                    />,
                    <GridActionsCellItem
                        key={`${id}-delete`}
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
                rows={documenti}
                columns={columns}
                getRowId={(row) => row.id}
                localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                getRowHeight={() => 'auto'} // <-- ECCO LA MODIFICA CHIAVE
                sx={{
                    '&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell': {
                        py: '15px', // Aggiunge padding verticale per dare respiro
                    },
                    '& .MuiDataGrid-cell': {
                        whiteSpace: 'normal !important', // Permette al testo di andare a capo
                        wordWrap: 'break-word !important',
                        alignItems: 'flex-start', // Allinea il contenuto in alto
                    },
                     '& .MuiDataGrid-columnHeaderTitle': { 
                        fontWeight: 'bold' 
                    },
                }}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 25 },
                    },
                    sorting: {
                        sortModel: [{ field: 'nome', sort: 'asc' }],
                    }
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                slots={{ toolbar: GridToolbar }}
                disableRowSelectionOnClick
            />
        </Box>
    );
};

export default DocumentiList;
