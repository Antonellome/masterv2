
import React from 'react';
import { DataGrid, GridColDef, GridValueGetterParams, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Paper, IconButton, Tooltip, Typography } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import type { Rapportino, Tecnico } from '@/models/definitions';
import CustomToolbar from '@/components/CustomToolbar';
import { calculateTotalHours } from '@/utils/hoursCalculator';
import { formatDateForDisplay } from '@/utils/dateUtils'; // <-- IMPORT DELL'UNICA VERA LEGGE

interface RapportiniListProps {
    rapportini: Rapportino[];
    tecniciMap: Map<string, Tecnico>;
    naviMap: Map<string, string>;
    luoghiMap: Map<string, string>;
    loading: boolean;
    onAdd: () => void;
    onEdit: (rapportino: Rapportino) => void;
    onDelete: (id: string) => void;
}

const RapportiniList: React.FC<RapportiniListProps> = ({ rapportini, tecniciMap, naviMap, luoghiMap, loading, onAdd, onEdit, onDelete }) => {

    const columns: GridColDef[] = [
        {
            field: 'dataInizio',
            headerName: 'Data',
            width: 110,
            valueGetter: (params: GridValueGetterParams) => {
                const row = params.row as Partial<Rapportino>;
                return row.dataInizio || row.data;
            },
            // --- APPLICAZIONE DELLA NUOVA LEGGE ---
            renderCell: (params: GridRenderCellParams) => {
                const formattedDate = formatDateForDisplay(params.value);
                const isInvalid = formattedDate === 'Data Invalida';
                return (
                    <Typography color={isInvalid ? 'error' : 'inherit'}>
                        {formattedDate}
                    </Typography>
                );
            },
            type: 'date', // Mantenuto per l'ordinamento
        },
        {
            field: 'cognome',
            headerName: 'Cognome',
            flex: 1,
            valueGetter: (params: GridValueGetterParams) => {
                 const tecnico = tecniciMap.get(params.row.tecnicoId);
                 return tecnico ? tecnico.cognome : 'N/D';
            },
        },
        {
            field: 'nome',
            headerName: 'Nome',
            flex: 1,
            valueGetter: (params: GridValueGetterParams) => {
                 const tecnico = tecniciMap.get(params.row.tecnicoId);
                 return tecnico ? tecnico.nome : '';
            },
        },
        {
            field: 'nave',
            headerName: 'Nave',
            flex: 1.5,
            valueGetter: (params: GridValueGetterParams) => {
                return naviMap.get(params.row.naveId) || '-';
            },
        },
        {
            field: 'luogo',
            headerName: 'Luogo',
            flex: 1.5,
            valueGetter: (params: GridValueGetterParams) => {
                return luoghiMap.get(params.row.luogoId) || '-';
            },
        },
        {
            field: 'oreTotali',
            headerName: 'Ore',
            type: 'number',
            width: 80,
            align: 'right',
            headerAlign: 'right',
            valueGetter: (params: GridValueGetterParams) => {
                return calculateTotalHours(params.row as Rapportino);
            },
            valueFormatter: (params) => {
                const hours = params.value as number;
                return hours.toFixed(2);
            }
        },
        {
            field: 'actions',
            headerName: 'Azioni',
            sortable: false, filterable: false, disableColumnMenu: true,
            width: 100, align: 'center', headerAlign: 'center',
            renderCell: (params) => (
                <Box>
                    <Tooltip title="Modifica">
                        <IconButton size="small" onClick={() => onEdit(params.row as Rapportino)} color="primary"><Edit /></IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                        <IconButton size="small" onClick={() => onDelete(params.id as string)} color="default"><Delete /></IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Paper sx={{ height: '75vh', width: '100%' }}>
            <DataGrid
                rows={rapportini || []}
                columns={columns}
                loading={loading}
                slots={{ toolbar: CustomToolbar }}
                slotProps={{
                    toolbar: {
                      onAdd: onAdd,
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 },
                    },
                  }}
                initialState={{
                    pagination: { paginationModel: { pageSize: 50 } },
                    sorting: {
                        sortModel: [{ field: 'dataInizio', sort: 'desc' }],
                    },
                }}
                pageSizeOptions={[25, 50, 100]}
                disableRowSelectionOnClick
            />
        </Paper>
    );
};

export default RapportiniList;
