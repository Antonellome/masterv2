
import React from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useGlobalStore } from '../stores/globalStore';

const GlobalAlert: React.FC = () => {
  // Esempio di come leggere lo stato degli alert dallo store
  // const { alertOptions, confirmOptions, hideAlert, resolveConfirm } = useGlobalStore();

  // Logica per mostrare Snackbar o Dialog in base a alertOptions/confirmOptions

  return (
    <>
      {/* Esempio di Snackbar */}
      {/* <Snackbar open={alertOptions.open} autoHideDuration={6000} onClose={hideAlert}>
        <Alert onClose={hideAlert} severity={alertOptions.severity} sx={{ width: '100%' }}>
          {alertOptions.message}
        </Alert>
      </Snackbar> */}

      {/* Esempio di Dialog di conferma */}
      {/* <Dialog open={confirmOptions.open} onClose={() => resolveConfirm(false)}>
        <DialogTitle>{confirmOptions.title}</DialogTitle>
        <DialogContent>{confirmOptions.message}</DialogContent>
        <DialogActions>
          <Button onClick={() => resolveConfirm(false)}>Annulla</Button>
          <Button onClick={() => resolveConfirm(true)} autoFocus>Conferma</Button>
        </DialogActions>
      </Dialog> */}
    </>
  );
};

export default GlobalAlert;
