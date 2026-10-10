
import { useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, Switch, Tooltip, Backdrop, IconButton, Snackbar, Alert } from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Tecnico } from '@/models/definitions';
import ConfirmationDialog from '@/components/Anagrafiche/ConfirmationDialog'; // Corretto percorso
import { useAnagrafiche } from '@/contexts/AnagraficheContext';
import { logger } from '@/utils/logger';
import { tecniciService, resetPasswordTecnico } from '@/services/tecniciService'; // Import consolidati

interface DialogState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
}

const GestioneAccessi = () => {
  const { tecnici, isLoading: areAnagraficheLoading, error: anagraficheError, updateTecnico } = useAnagrafiche();

  const [operatingRowId, setOperatingRowId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [dialog, setDialog] = useState<DialogState>({ open: false, title: '', content: '', onConfirm: () => {} });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleToggleAccess = useCallback(async (tecnico: Tecnico) => {
    const docId = tecnico.id; // L'ID del documento è sempre tecnico.id
    if (!docId) {
        showSnackbar('ID del documento tecnico mancante. Impossibile procedere.', 'error');
        return;
    }
    
    // *** LA VERA CORREZIONE: USARE L'IDENTIFICATORE CORRETTO PER AUTH ***
    const authIdentifier = tecnico.uid || tecnico.id; // Usa l'UID se esiste, altrimenti fallback sull'ID (per i vecchi dati)
    // **********************************************************************

    setOperatingRowId(docId);
    showSnackbar('Aggiornamento accesso in corso...', 'info');

    const newAccessStatus = !tecnico.appAccess;

    try {
      await tecniciService('toggle-active', { 
          id: authIdentifier, 
          attivo: newAccessStatus 
      });
      
      // La logica di sync è già nel service, non serve updateTecnico qui.
      showSnackbar(`Accesso per ${tecnico.cognome} ${newAccessStatus ? 'abilitato' : 'revocato'}.`, 'success');

    } catch (e: any) {
        logger.error("Errore durante l'aggiornamento dell'accesso:", e);
        showSnackbar(e.message || 'Errore sconosciuto.', 'error');
    } finally {
        setOperatingRowId(null);
    }
  }, [updateTecnico]);

  const executeResetPassword = async (email: string) => {
      try {
          await resetPasswordTecnico(email);
          // La notifica di successo è già gestita nel service
      } catch (e) {
          // La notifica di errore è già gestita nel service
      }
      setDialog({ open: false, title: '', content: '', onConfirm: () => {} });
  };

  const handleResetPassword = (email: string | null | undefined) => {
    if (!email) {
      showSnackbar('Email non disponibile per questo tecnico. Impossibile inviare il reset.', 'error');
      return;
    }
    setDialog({
      open: true,
      title: 'Conferma Invio Email di Reset',
      content: `Stai per inviare un'email di reset password all'indirizzo ${email}. Vuoi procedere?`,
      onConfirm: () => executeResetPassword(email),
    });
  };

  const getTooltipTitle = (row: Tecnico): string => {
    if (!row.id) return "ID Utente mancante!";
    if (!row.email) return "Impossibile abilitare l'accesso: email mancante";
    return row.appAccess ? 'Revoca accesso all\'app' : 'Abilita accesso all\'app';
  }

  const columns: GridColDef<Tecnico>[] = [
    { field: 'cognome', headerName: 'Cognome', flex: 1, minWidth: 150 },
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.5,
      minWidth: 250,
      renderCell: (params: GridRowParams<Tecnico>) => (
        params.row.email ? (
          <Typography variant="body2">{params.row.email}</Typography>
        ) : (
          <Tooltip title="Email mancante! Aggiornare l'anagrafica del tecnico.">
            <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
              <ErrorOutlineIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2">Mancante</Typography>
            </Box>
          </Tooltip>
        )
      )
    },
    {
      field: 'appAccess',
      headerName: 'Accesso App',
      width: 130, align: 'center', headerAlign: 'center',
      renderCell: (params: GridRowParams<Tecnico>) => (
        <Tooltip title={getTooltipTitle(params.row)}>
          <span>
            <Switch
              checked={params.row.appAccess || false}
              onChange={() => handleToggleAccess(params.row)}
              disabled={operatingRowId === params.row.id || !params.row.id}
              color="primary"
            />
          </span>
        </Tooltip>
      ),
    },
    {
        field: 'actions',
        headerName: 'Password',
        sortable: false, disableColumnMenu: true, width: 100, align: 'center', headerAlign: 'center',
        renderCell: (params: GridRowParams<Tecnico>) => (
            <Tooltip title={!params.row.email ? "Email non disponibile" : "Invia Email per resettare la Password"}>
              <span>
                <IconButton
                    onClick={() => handleResetPassword(params.row.email)}
                    color="primary"
                    disabled={operatingRowId === params.row.id || !params.row.appAccess || !params.row.email || !params.row.id}
                >
                    <VpnKeyIcon />
                </IconButton>
              </span>
            </Tooltip>
        ),
    },
  ];

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') return;
      setSnackbar({ ...snackbar, open: false });
  };

  const handleCloseDialog = () => {
    setDialog({ ...dialog, open: false });
  };

  if (anagraficheError) {
      return <Typography color="error">{`Si è verificato un errore nel caricamento: ${anagraficheError}`}</Typography>;
  }

  return (
    <Box>
      <Box sx={{ width: '100%' }}> 
        <DataGrid
            rows={tecnici || []}
            getRowId={(row) => row.id}
            columns={columns}
            localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
            slots={{ toolbar: GridToolbar }}
            disableRowSelectionOnClick
            autoHeight
            loading={!!operatingRowId || areAnagraficheLoading}
        />
      </Box>

      <ConfirmationDialog 
        open={dialog.open}
        onClose={handleCloseDialog}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.content} // Corretto da 'content' a 'message'
      />

      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={!!operatingRowId}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
              {snackbar.message}
          </Alert>
      </Snackbar>
    </Box>
  );
};

export default GestioneAccessi;
