
import React from 'react';
import { DataGrid, GridColDef, GridValueGetterParams, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Paper, IconButton, Tooltip, Typography } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import type { Rapportino, Tecnico, Cliente, Nave, Luogo, TipoGiornata } from '@/models/definitions';
import CustomToolbar from '@/components/CustomToolbar';
import { calculateTotalHours } from '@/utils/hoursCalculator';
import { formatDateForDisplay } from '@/utils/dateUtils';

interface RapportiniListProps {
    rapportini: Rapportino[];
    tecniciMap: Map<string, Tecnico>;
    clientiMap: Map<string, Cliente>;
    naviMap: Map<string, Nave>;
    luoghiMap: Map<string, Luogo>;
    tipiGiornataMap: Map<string, TipoGiornata>;
    loading: boolean;
    onAdd: () => void;
    onEdit: (rapportino: Rapportino) => void;
    onDelete: (id: string) => void;
}

const RapportiniList: React.FC<RapportiniListProps> = ({ rapportini, tecniciMap, clientiMap, naviMap, luoghiMap, tipiGiornataMap, loading, onAdd, onEdit, onDelete }) => {

    const columns: GridColDef[] = [
        {
            field: 'dataInizio',
            headerName: 'Data',
            width: 100,
            valueGetter: (params: GridValueGetterParams) => params.row.dataInizio || params.row.data, // Fallback per legacy
            renderCell: (params: GridRenderCellParams) => {
                const formattedDate = formatDateForDisplay(params.value);
                const isInvalid = formattedDate === 'Data Invalida';
                return <Typography color={isInvalid ? 'error' : 'inherit'} variant="body2">{formattedDate}</Typography>;
            },
        },
        {
            field: 'tecnico',
            headerName: 'Tecnico',
            flex: 1.2,
            valueGetter: (params: GridValueGetterParams) => {
                 const tecnico = tecniciMap.get(params.row.tecnicoId);
                 return tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'N/D';
            },
        },
        {
            field: 'descrizione',
            headerName: 'Breve Descrizione',
            flex: 2,
            valueGetter: (params: GridValueGetterParams) => params.row.lavoroEseguito || '-',
        },
        {
            field: 'tipoGiornata',
            headerName: 'Tipo',
            flex: 1,
            valueGetter: (params: GridValueGetterParams) => params.row.tipoGiornataNome || '-',
        },
        {
            field: 'nave',
            headerName: 'Nave',
            flex: 1.5,
            valueGetter: (params: GridValueGetterParams) => params.row.naveNome || '-',
        },
        {
            field: 'luogo',
            headerName: 'Luogo',
            flex: 1.5,
            valueGetter: (params: GridValueGetterParams) => params.row.luogoNome || '-',
        },
        {
            field: 'oreTotali',
            headerName: 'Ore Totali',
            type: 'number',
            width: 100,
            align: 'right',
            headerAlign: 'right',
            valueGetter: (params: GridValueGetterParams) => calculateTotalHours(params.row as Rapportino),
            valueFormatter: (params) => `${(params.value as number).toFixed(2)}h`,
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
                        <IconButton size="small" onClick={() => onDelete(params.id as string)} color="error"><Delete /></IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    const safeRapportini = rapportini ? rapportini.filter(Boolean) : [];

    return (
        <Paper sx={{ height: '78vh', width: '100%' }}>
            <DataGrid
                rows={safeRapportini}
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
                    pagination: { paginationModel: { pageSize: 100 } },
                    sorting: {
                        sortModel: [{ field: 'dataInizio', sort: 'desc' }],
                    },
                }}
                pageSizeOptions={[25, 50, 100, 200]}
                disableRowSelectionOnClick
                getRowHeight={() => 'auto'}
                sx={{ '&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell': { py: 1 } }}
            />
        </Paper>
    );
};

export default RapportiniList;
