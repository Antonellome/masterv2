
import { useState, useEffect, useCallback } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Box, Typography, CircularProgress, Switch, Tooltip, Backdrop, IconButton, Snackbar, Alert, Divider
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface Tecnico {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  appAccess: boolean; 
  attivo: boolean;
}

interface DialogState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
}

const functions = getFunctions(undefined, 'europe-west1');
// Funzione Cloud singola e più potente
const manageTecnicoAccess = httpsCallable(functions, 'manageTecnicoAccess');

const GestioneAccessi = () => {
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [dialog, setDialog] = useState<DialogState>({ open: false, title: '', content: '', onConfirm: () => {} });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDetailedError = (err: any, context: string) => {
    console.error(`ERRORE [${context}]:`, err);
    const message = err.message || 'Errore sconosciuto.';
    showSnackbar(`[${context}] ${message}`, 'error');
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'tecnici'),
        where('attivo', '==', true),
        orderBy('cognome'),
        orderBy('nome')
      );
      const anagraficaSnapshot = await getDocs(q);
      const tecniciList = anagraficaSnapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome || '',
        cognome: doc.data().cognome || '',
        email: doc.data().email || '',
        attivo: doc.data().attivo === true,
        // Assicuriamoci che appAccess sia sempre un booleano
        appAccess: doc.data().appAccess === true,
      } as Tecnico));
      setTecnici(tecniciList);
    } catch (err) {
      handleDetailedError(err, 'Caricamento Tecnici');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAccess = async (tecnico: Tecnico) => {
    if (!tecnico.email) {
      showSnackbar('Impossibile abilitare un utente senza email. Aggiorna l\'anagrafica.', 'error');
      return;
    }

    setOperating(true);
    const newState = !tecnico.appAccess;

    try {
        // La nuova funzione si aspetta l'email e l'azione desiderata (enable/disable)
        // Se l'utente non esiste durante un'abilitazione, la funzione cloud lo creerà.
        await manageTecnicoAccess({ 
            email: tecnico.email, 
            action: newState ? 'enable' : 'disable' 
        });

        // L'aggiornamento di Firestore avviene ora nella Cloud Function per coerenza,
        // ma lo facciamo anche qui per una risposta immediata dell'UI.
        const tecnicoRef = doc(db, 'tecnici', tecnico.id);
        await updateDoc(tecnicoRef, { appAccess: newState });

        showSnackbar(`Accesso ${newState ? 'abilitato' : 'revocato'} per ${tecnico.nome} ${tecnico.cognome}.`, 'success');
        setTecnici(prevTecnici => prevTecnici.map(t => t.id === tecnico.id ? { ...t, appAccess: newState } : t));

    } catch (err) {
        handleDetailedError(err, "Operazione Fallita");
        // Se l'operazione fallisce, non aggiorniamo lo stato locale per mantenere la coerenza
    } finally {
        setOperating(false);
    }
};

  const executeResetPassword = async (email: string) => {
    setOperating(true);
    try {
        await sendPasswordResetEmail(getAuth(), email);
        showSnackbar(`Email di ripristino inviata a ${email}.`, 'success');
    } catch (error) {
        handleDetailedError(error, "Reset Password Fallito");
    } finally {
        setOperating(false);
        setDialog({ open: false, title: '', content: '', onConfirm: () => {} });
    }
  };

  const handleResetPassword = (email: string | null | undefined) => {
    if (!email) {
      showSnackbar('Email non disponibile per questo tecnico. Impossibile inviare il reset.', 'error');
      return;
    }
    setDialog({
      open: true,
      title: 'Conferma Invio Email',
      content: `Stai per inviare un\'email di ripristino password all\'indirizzo ${email}. Vuoi procedere?`,
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
          <Tooltip title="Email mancante! Aggiornare l\'anagrafica.">
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
        <Tooltip title={params.row.appAccess ? 'Revoca accesso' : 'Abilita accesso'}>
          <span>
            <Switch
              checked={params.row.appAccess}
              onChange={() => handleToggleAccess(params.row)}
              disabled={operating || !params.row.email}
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
                    disabled={operating || !params.row.appAccess || !params.row.email}
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

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Gestione Accesso App Tecnici</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Da questa sezione puoi abilitare o revocare l'accesso all\'app mobile per ogni tecnico e inviare l'email per il reset della password.
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ height: 500, width: '100%' }}>
        {loading ? (
          <CircularProgress sx={{ display: 'block', margin: 'auto' }} />
        ) : (
          <DataGrid
              rows={tecnici}
              columns={columns}
              localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
              slots={{ toolbar: GridToolbar }}
              disableRowSelectionOnClick
              autoHeight={false}
          />
        )}
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
