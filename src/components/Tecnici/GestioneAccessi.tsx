
import { useState, useEffect, useCallback } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'; // 1. Importato `where`
import { db } from '@/firebase';
import {
  Box, Typography, CircularProgress, Switch, Tooltip, Backdrop, IconButton, Snackbar, Alert, Divider
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

interface Tecnico {
  id: string; 
  nome: string;
  cognome: string;
  email: string;
  abilitato: boolean; 
  attivo: boolean; // Aggiunto per coerenza
}

const functions = getFunctions(undefined, 'europe-west1');
const manageAccess = httpsCallable(functions, 'manageAccess');

const GestioneAccessi = () => {
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

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
      // 2. AGGIUNTO IL FILTRO `where`
      const q = query(
        collection(db, 'tecnici'), 
        where('attivo', '==', true), // Mostra solo i tecnici attivi!
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
        abilitato: doc.data().abilitato === true, 
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
    setOperating(true);
    const nuovoStato = !tecnico.abilitato;

    try {
        await manageAccess({
            action: 'toggleAbilitato',
            payload: { uid: tecnico.id, abilitato: nuovoStato }
        });
        showSnackbar(`Accesso ${nuovoStato ? 'abilitato' : 'revocato'} per ${tecnico.nome} ${tecnico.cognome}.`, 'success');
        await fetchData(); 
    } catch (err) {
        handleDetailedError(err, "Abilitazione Fallita");
    } finally {
        setOperating(false);
    }
  };

  const handleResetPassword = async (email: string) => {
      if (!window.confirm(`Inviare un'email di ripristino password a ${email}?`)) return;
      setOperating(true);
      try {
          await sendPasswordResetEmail(getAuth(), email);
          showSnackbar(`Email di ripristino inviata a ${email}.`, 'success');
      } catch (error) {
          handleDetailedError(error, "Reset Password Fallito");
      } finally {
          setOperating(false);
      }
  };

  const columns: GridColDef<Tecnico>[] = [
    { field: 'cognome', headerName: 'Cognome', flex: 1, minWidth: 150 },
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 250 },
    {
      field: 'abilitato',
      headerName: 'Accesso App Mobile',
      width: 180, align: 'center', headerAlign: 'center',
      renderCell: (params: GridRowParams<Tecnico>) => (
        <Tooltip title={params.row.abilitato ? 'Revoca accesso' : 'Abilita accesso' }>
          <Switch
            checked={params.row.abilitato}
            onChange={() => handleToggleAccess(params.row)}
            disabled={operating}
            color="success"
          />
        </Tooltip>
      ),
    },
    {
        field: 'actions',
        headerName: 'Password',
        sortable: false, disableColumnMenu: true, width: 100, align: 'center', headerAlign: 'center',
        renderCell: (params: GridRowParams<Tecnico>) => (
            <Tooltip title="Invia Email per impostare/resettare la Password">
              <span>
                <IconButton
                    onClick={() => handleResetPassword(params.row.email)}
                    color="primary"
                    disabled={operating || !params.row.abilitato}
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

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Gestione Accesso App Tecnici</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Da questa sezione puoi abilitare o revocare l'accesso all'app mobile per ogni tecnico e inviare l'email per il reset della password.
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
