import {
    Box, Typography, Switch, Button, Paper
} from '@mui/material';
import {
    DataGrid, GridColDef, GridRenderCellParams, GridToolbarContainer,
    GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector,
    GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import type { DataRow } from '@/models/definitions';

interface CustomToolbarProps {
    onAddNew?: () => void;
}

function CustomToolbar({ onAddNew }: CustomToolbarProps) {
    return (
        <GridToolbarContainer>
            {onAddNew && (
                <Button
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={onAddNew}
                >
                    Nuovo
                </Button>
            )}
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            <Box sx={{ flex: 1 }} />
            <GridToolbarQuickFilter
                sx={{ minWidth: 240, mr: 1 }}
                placeholder="Cerca..."
                variant="outlined"
                size="small"
            />
        </GridToolbarContainer>
    );
}

interface UserLike extends DataRow {
  id: string;
  email: string;
  [key: string]: unknown;
}

interface GestioneUtentiProps<T extends UserLike> {
  title: string;
  data: T[];
  baseColumns: GridColDef<T>[];
  statusField: keyof T;
  onStatusChange: (id: string, newStatus: boolean) => Promise<void>;
  onSendPassword: (email: string) => void;
  onAddNew?: () => void;
}

const GestioneUtenti = <T extends UserLike>({
  title,
  data,
  baseColumns,
  statusField,
  onStatusChange,
  onSendPassword,
  onAddNew,
}: GestioneUtentiProps<T>) => {

  const actionColumns: GridColDef<T>[] = [
    {
      field: 'statusAction',
      headerName: 'Abilitato',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<T>) => (
        <Switch
          checked={!!params.row[statusField]}
          onChange={(e) => onStatusChange(params.row.id, e.target.checked)}
        />
      ),
    },
    {
      field: 'passwordAction',
      headerName: 'Invio Credenziali',
      width: 180,
      align: 'center', // <-- ERRORE CORRETTO
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<T>) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => onSendPassword(params.row.email)}
        >
          Invia Password
        </Button>
      ),
    },
  ];

  const columns = [...baseColumns, ...actionColumns];

  return (
    <Box sx={{ p: 3, height: '100%', width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Paper sx={{ height: 'calc(100% - 48px)', width: '100%' }}>
        <DataGrid
          rows={data}
          columns={columns}
          getRowId={(row) => row.id}
          slots={{
            toolbar: CustomToolbar 
          }}
           slotProps={{
             toolbar: { onAddNew },
           }}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 100 },
            },
          }}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
        />
      </Paper>
    </Box>
  );
};

export default GestioneUtenti;
