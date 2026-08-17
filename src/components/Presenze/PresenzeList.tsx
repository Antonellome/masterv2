
import { Box, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';

const formatTimestamp = (timestamp: Timestamp | Date | string | null | undefined): string => {
    if (!timestamp) return 'N/D';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    if (!dayjs(date).isValid()) return 'Data non valida';
    return dayjs(date).format('DD/MM/YYYY HH:mm:ss');
};

function CustomToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport csvOptions={{ utf8WithBom: true }} />
            <Box sx={{ flex: 1 }} />
            <GridToolbarQuickFilter sx={{ minWidth: 240 }} placeholder="Cerca..." variant="outlined" size="small" />
        </GridToolbarContainer>
    );
}

const columns: GridColDef[] = [
    {
        field: 'timestampReale',
        headerName: 'Data e Ora',
        width: 180,
        type: 'dateTime',
        valueGetter: (value) => value instanceof Timestamp ? value.toDate() : new Date(value),
        renderCell: (params) => (
             <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{formatTimestamp(params.value)}</Typography>
        ),
    },
    { field: 'tecnicoName', headerName: 'Tecnico', flex: 1, minWidth: 150 },
    { field: 'tipo', headerName: 'Tipo Evento', flex: 1, minWidth: 150 },
    { field: 'luogo', headerName: 'Nave / Luogo', flex: 1.5, minWidth: 200 },
];

interface PresenzeListProps {
    rows: any[];
    loading: boolean;
}

const PresenzeList = ({ rows, loading }: PresenzeListProps) => {
    return (
        // NESSUN CONTENITORE CON ALTEZZA FISSA.
        <Box sx={{ width: '100%' }}>
            <DataGrid
                // L'UNICA SOLUZIONE CORRETTA. LA TUA. autoHeight.
                autoHeight
                rows={rows}
                columns={columns}
                loading={loading}
                localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                slots={{ toolbar: CustomToolbar }}
                density="compact"
                initialState={{
                    sorting: {
                        sortModel: [{ field: 'timestampReale', sort: 'desc' }],
                    },
                    pagination: {
                        paginationModel: { pageSize: 100 },
                    },
                }}
                pageSizeOptions={[25, 50, 100, 200]}
                disableRowSelectionOnClick
                sx={{ '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' } }}
            />
        </Box>
    );
};

export default PresenzeList;
