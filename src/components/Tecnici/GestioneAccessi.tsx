
import { useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, Switch, Tooltip, Backdrop, IconButton, Snackbar, Alert } from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Tecnico } from '@/models/definitions';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useGlobalStore } from '@/stores/globalStore'; // <-- IMPORTATO useGlobalStore

interface DialogState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
}

const GestioneAccessi = () => {
  // Recupera lo stato di caricamento dallo store globale
  const areAnagraficheLoading = useGlobalStore((state) => state.areAnagraficheLoading);

  const tecnici = useLiveQuery(() => 
    db.tecnici.orderBy('cognome').toArray()
  , []);

  const [operating, setOperating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [dialog, setDialog] = useState<DialogState>({ open: false, title: '', content: '', onConfirm: () => {} });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleToggleAccess = useCallback(async (tecnico: Tecnico) => {
    setOperating(true);
    try {
      const newAccessStatus = !tecnico.appAccess;
      await db.tecnici.update(tecnico.id, { 
        appAccess: newAccessStatus,
        isDirty: true, 
      });
      showSnackbar(`Accesso per ${tecnico.cognome} ${tecnico.nome} ${newAccessStatus ? 'abilitato' : 'revocato'}. La modifica sarà inviata alla prossima sincronizzazione.`, 'success');
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'accesso:", error);
      showSnackbar(error instanceof Error ? error.message : 'Errore sconosciuto', 'error');
    } finally {
      setOperating(false);
    }
  }, []);

  const executeResetPassword = async (email: string) => {
      console.warn("Reset password non ancora implementato in modalità offline.", email);
      showSnackbar('Funzionalità non ancora disponibile in modalità offline.', 'error');
      setDialog({ open: false, title: '', content: '', onConfirm: () => {} });
  };

  const handleResetPassword = (email: string | null | undefined) => {
    if (!email) {
      showSnackbar('Email non disponibile per questo tecnico. Impossibile inviare il reset.', 'error');
      return;
    }
    setDialog({
      open: true,
      title: 'Conferma Invio Email',
      content: `La funzione di invio email non è ancora attiva in questa modalità.`,
      onConfirm: () => executeResetPassword(email),
    });
  };

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
          <Tooltip title="Email mancante! Aggiornare l'anagrafica.">
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
        <Tooltip title={!params.row.uid ? "UID di autenticazione mancante!" : (params.row.appAccess ? 'Revoca accesso' : 'Abilita accesso')}>
          <span>
            <Switch
              checked={params.row.appAccess || false}
              onChange={() => handleToggleAccess(params.row)}
              disabled={operating || !params.row.uid}
              color="success"
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
            <Tooltip title={!params.row.email ? "Email non disponibile" : "Invia Email per impostare/resettare la Password"}>
              <span>
                <IconButton
                    onClick={() => handleResetPassword(params.row.email)}
                    color="primary"
                    disabled={operating || !params.row.appAccess || !params.row.email || !params.row.uid}
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

  // CONTROLLO DI CARICAMENTO ROBUSTO
  if (areAnagraficheLoading || !tecnici) {
    return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
  }

  return (
    <Box>
      <Box sx={{ width: '100%' }}> 
        <DataGrid
            rows={tecnici}
            getRowId={(row) => row.id}
            columns={columns}
            localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
            slots={{ toolbar: GridToolbar }}
            disableRowSelectionOnClick
            autoHeight
        />
      </Box>

      <ConfirmationDialog 
        open={dialog.open}
        title={dialog.title}
        content={dialog.content}
        onConfirm={dialog.onConfirm}
        onCancel={handleCloseDialog}
      />

      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={operating}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
          </Alert>
      </Snackbar>
    </Box>
  );
};

export default GestioneAccessi;
