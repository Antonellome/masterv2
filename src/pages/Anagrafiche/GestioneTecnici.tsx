
import { useMemo } from 'react';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridValueGetterParams } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { useAuthStore } from '@/stores/authStore';
import { Tecnico } from '@/models/definitions';
import { Timestamp } from 'firebase/firestore';

const GestioneTecnici = () => {
  const { tecnici, appLoading, ditte, categorie } = useAuthStore(state => ({ 
    tecnici: state.tecnici, 
    appLoading: state.appLoading, 
    ditte: state.ditte,
    categorie: state.categorie
  }));

  const columns: GridColDef<Tecnico>[] = useMemo(() => [
    { field: 'cognome', headerName: 'Cognome', flex: 1, minWidth: 130 },
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 130 },
    {
      field: 'categoriaId',
      headerName: 'Categoria',
      flex: 1,
      minWidth: 140,
      valueGetter: (params: GridValueGetterParams<Tecnico>) => {
        const categoria = categorie.find(c => c.id === params.row.categoriaId);
        return categoria ? categoria.nome : 'N/A';
      },
    },
    {
      field: 'dittaId',
      headerName: 'Ditta',
      flex: 1,
      minWidth: 140,
      valueGetter: (params: GridValueGetterParams<Tecnico>) => {
        const ditta = ditte.find(d => d.id === params.row.dittaId);
        return ditta ? ditta.nome : 'Nessuna';
      },
    },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    { field: 'telefono', headerName: 'Telefono', flex: 1, minWidth: 150 },
    { 
      field: 'attivo', 
      headerName: 'Stato', 
      width: 100, 
      align: 'center', 
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Attivo' : 'Non Attivo'} 
          color={params.value ? 'success' : 'error'} 
          variant="outlined" 
          size="small"
        />
      )
    },
    {
      field: 'appAccess',
      headerName: 'Accesso App',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Abilitato' : 'Disabilitato'} 
          color={params.value ? 'success' : 'default'} 
          size="small"
        />
      )
    }
  ], [ditte, categorie]);

  if (appLoading) {
    return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Anagrafica Tecnici
      </Typography>
      <Box sx={{ height: 650, width: '100%' }}>
        <DataGrid
          rows={tecnici}
          columns={columns}
          getRowId={(row) => row.id}
          localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          disableRowSelectionOnClick
          autoHeight
        />
      </Box>
    </Box>
  );
};

export default GestioneTecnici;
