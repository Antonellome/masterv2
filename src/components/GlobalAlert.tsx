
import { useGlobalStore } from '@/stores/globalStore';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';

/**
 * Componente globale per la gestione di notifiche (Snackbar) e dialoghi di conferma (Dialog).
 * Legge lo stato direttamente dallo store Zustand e non richiede props.
 */
export const GlobalAlert = () => {
  // CORREZIONE: Usiamo i nomi corretti ('dialog', 'hideDialog') come definiti in globalStore.ts
  const {
    notification,
    dialog,
    hideNotification,
    hideDialog,
  } = useGlobalStore(state => ({
    notification: state.notification,
    dialog: state.dialog,
    hideNotification: state.hideNotification,
    hideDialog: state.hideDialog,
  }));

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    hideNotification();
  };

  const handleAlertClose = (confirmed: boolean) => {
    // Eseguiamo il callback `onConfirm` solo se l'utente ha confermato
    if (confirmed && dialog?.onConfirm) {
      dialog.onConfirm();
    }
    hideDialog();
  };

  return (
    <>
      {/* --- Componente per le NOTIFICHE --- */}
      <Snackbar
        open={notification?.open || false}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <div>
          {notification?.message && (
            <Alert
              onClose={handleCloseSnackbar}
              severity={notification.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {notification.message}
            </Alert>
          )}
        </div>
      </Snackbar>

      {/* --- Componente per i DIALOGHI DI CONFERMA --- */}
      <Dialog
        open={dialog?.open || false}
        onClose={() => handleAlertClose(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{dialog?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {dialog?.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleAlertClose(false)} color="primary">
            {dialog?.cancelText || 'Annulla'}
          </Button>
          <Button onClick={() => handleAlertClose(true)} color="primary" autoFocus>
            {dialog?.confirmText || 'Conferma'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
