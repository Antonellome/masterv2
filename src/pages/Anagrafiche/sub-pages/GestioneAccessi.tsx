
import { useMemo } from 'react';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { useAuthStore } from '@/stores/authStore';
import { Tecnico } from '@/models/definitions';

const GestioneAccessi = () => {
  const { tecnici, appLoading } = useAuthStore(state => ({ 
    tecnici: state.tecnici, 
    appLoading: state.appLoading 
  }));

  const columns: GridColDef<Tecnico>[] = useMemo(() => [
    { field: 'cognome', headerName: 'Cognome', flex: 1, minWidth: 150 },
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
    { 
        field: 'email', 
        headerName: 'Email', 
        flex: 1.5, 
        minWidth: 220,
        renderCell: (params) => params.value || 'N/D'
    },
    {
        field: 'user_id',
        headerName: 'Stato Accesso',
        flex: 1,
        minWidth: 150,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
            params.value 
                ? <Chip label="Accesso Creato" color="success" variant="outlined" />
                : <Chip label="Accesso Mancante" color="error" variant="outlined" />
        )
    },
    { 
      field: 'attivo', 
      headerName: 'Stato Anagrafica', 
      width: 150, 
      align: 'center', 
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography color={params.value ? 'success.main' : 'error.main'}>
          {params.value ? 'Attivo' : 'Non Attivo'}
        </Typography>
      )
    },
  ], []);

  if (appLoading) {
    return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Gestione Accessi App Tecnici
      </Typography>
       <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={tecnici}
          columns={columns}
          getRowId={(row) => row.id}
          localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
          slots={{ toolbar: GridToolbar }}
          disableRowSelectionOnClick
          autoHeight
        />
      </Box>
    </Box>
  );
};

export default GestioneAccessi;
