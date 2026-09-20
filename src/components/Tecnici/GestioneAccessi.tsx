
import { useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, Switch, Tooltip, Backdrop, IconButton, Snackbar, Alert } from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Tecnico } from '@/models/definitions';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useAnagrafiche } from '@/contexts/AnagraficheContext';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { logger } from '@/utils/logger';

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
    if (!tecnico.id) {
        showSnackbar('ID del tecnico mancante. Impossibile procedere.', 'error');
        return;
    }

    setOperatingRowId(tecnico.id);
    showSnackbar('Aggiornamento accesso in corso...', 'info');

    const app = getApp();
    const functions = getFunctions(app, 'europe-west6');
    const callable = httpsCallable(functions, 'master_gestisciTecnico');
    // Leggiamo lo stato attuale da `appAccess` e lo invertiamo.
    const newAccessStatus = !tecnico.appAccess;

    try {
      const result = await callable({
        operation: 'toggle-access',
        data: { 
            id: tecnico.id,
            appAccess: newAccessStatus
        }
      });
      
      const resultData = result.data as { success: boolean };

      if (resultData.success) {
          // <<-- LA MODIFICA DEFINITIVA È QUI -->>
          // Aggiorniamo ENTRAMBI i campi nel nostro database locale (Dexie).
          // Questo forzerà la UI a ricaricare lo stato corretto.
          await updateTecnico(tecnico.id, { 
              appAccess: newAccessStatus,
              accessoApp: newAccessStatus
            });
          showSnackbar(`Accesso per ${tecnico.cognome} ${newAccessStatus ? 'abilitato' : 'revocato'}.`, 'success');
      } else {
          // Se il server nega l'operazione, ripristiniamo lo stato visivo originale per coerenza
          await updateTecnico(tecnico.id, { appAccess: !newAccessStatus, accessoApp: !newAccessStatus });
          throw new Error("Il server ha negato l'operazione senza un errore esplicito.");
      }
    } catch (e: any) {
        // In caso di errore, ripristiniamo lo stato visivo originale
        await updateTecnico(tecnico.id, { appAccess: !newAccessStatus, accessoApp: !newAccessStatus });
        logger.error("Errore durante l'aggiornamento dell'accesso:", e);
        const errorMessage = e.message || 'Errore sconosciuto. Controllare i log della console per i dettagli.';
        showSnackbar(errorMessage, 'error');
        console.error("Oggetto errore Firebase completo:", e);

    } finally {
        setOperatingRowId(null);
    }
  }, [updateTecnico]);

  const executeResetPassword = async (email: string) => {
      console.warn("Reset password non ancora implementato.", email);
      showSnackbar('Funzionalità non ancora implementata.', 'info');
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
      field: 'appAccess', // La colonna è correttamente legata ad `appAccess`
      headerName: 'Accesso App',
      width: 130, align: 'center', headerAlign: 'center',
      renderCell: (params: GridRowParams<Tecnico>) => (
        <Tooltip title={getTooltipTitle(params.row)}>
          <span>
            <Switch
              checked={params.row.appAccess || false} // Lo switch è correttamente legato ad `appAccess`
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
            <Tooltip title={!params.row.email ? "Email non disponibile" : "Invia Email per impostare/resettare la Password"}>
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
        title={dialog.title}
        content={dialog.content}
        onConfirm={dialog.onConfirm}
        onCancel={handleCloseDialog}
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
