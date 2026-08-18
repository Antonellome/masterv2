
import { Box, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';

// Funzione di utilità per formattare qualsiasi tipo di timestamp in una stringa leggibile
const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '--';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    if (!dayjs(date).isValid()) return 'Data non valida';
    // Formato più compatto e leggibile
    return dayjs(date).format('DD/MM/YY HH:mm');
};

// Toolbar personalizzata per la griglia
function CustomToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport csvOptions={{ utf8WithBom: true, fileName: 'registro_presenze' }} />
            <Box sx={{ flex: 1 }} />
            <GridToolbarQuickFilter sx={{ minWidth: 240 }} placeholder="Cerca..." variant="outlined" size="small" />
        </GridToolbarContainer>
    );
}

// --- Definizione delle colonne della tabella --- //
const columns: GridColDef[] = [
    {
        field: 'timestampImpostato',
        headerName: 'Orario Dichiarato',
        width: 160,
        type: 'dateTime',
        // valueGetter per assicurare che DataGrid possa ordinare correttamente le date
        valueGetter: (value) => value ? new Date(value) : null,
        renderCell: (params) => (
            <Typography variant="body2">
                {formatTimestamp(params.value)}
            </Typography>
        ),
    },
    {
        field: 'timestampReale',
        headerName: 'Orario di Invio',
        width: 160,
        type: 'dateTime',
        valueGetter: (value) => value ? new Date(value) : null,
        renderCell: (params) => (
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {formatTimestamp(params.value)}
            </Typography>
        ),
        // Ordinamento predefinito: dal più recente al meno recente
        sort: 'desc',
    },
    { field: 'tecnicoName', headerName: 'Tecnico', flex: 1, minWidth: 150 },
    { field: 'tipo', headerName: 'Tipo Evento', flex: 1, minWidth: 120 },
    { field: 'luogo', headerName: 'Nave / Luogo', flex: 1.5, minWidth: 200 },
];

interface PresenzeListProps {
    rows: any[];
    loading: boolean;
}

const PresenzeList = ({ rows, loading }: PresenzeListProps) => {
    return (
        <Box sx={{ width: '100%' }}>
            <DataGrid
                autoHeight
                rows={rows}
                columns={columns}
                loading={loading}
                localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                slots={{ toolbar: CustomToolbar }}
                density="compact"
                initialState={{
                    // Imposta l'ordinamento iniziale sulla colonna 'timestampReale'
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
