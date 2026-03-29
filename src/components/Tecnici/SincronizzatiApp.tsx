
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Box, Typography, CircularProgress, Alert, Switch, Tooltip, Backdrop, IconButton, Snackbar
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

// --- TIPI E INTERFACCE ---
interface TecnicoDoc {
  id: string; 
  attivo: boolean;
  nome: string;
  cognome: string;
  email: string;
  authUid?: string; 
  ruolo?: string; 
}
interface AuthUser {
  uid: string;
  email: string;
  ruolo: string;
}
type MergedUser = TecnicoDoc;

// --- FUNZIONI FIREBASE ---
const functions = getFunctions(undefined, 'europe-west1');
const manageUsers = httpsCallable(functions, 'manageUsers');

const SincronizzatiApp = () => {
  // --- STATI DEL COMPONENTE ---
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [tecnici, setTecnici] = useState<TecnicoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // --- GESTIONE ERRORI --
  const handleDetailedError = (err: any, context: string) => {
    console.error(`ERRORE [${context}]:`, err);
    const errorMessage = err.message || 'Errore sconosciuto';
    setSnackbar({ open: true, message: `[${context}] ${errorMessage}`, severity: 'error' });
  };

  // --- CARICAMENTO DATI ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResult, anagraficaTecniciSnapshot] = await Promise.all([
        manageUsers({ action: 'list' }),
        getDocs(collection(db, 'tecnici'))
      ]);
      
      setAuthUsers((usersResult.data as any).users || []);
      setTecnici(anagraficaTecniciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TecnicoDoc)));

    } catch (err) {
      handleDetailedError(err, 'Caricamento Dati');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- LOGICA DI VISUALIZZAZIONE ---
  const mergedUsers = useMemo((): MergedUser[] => {
    const authUserMap = new Map(authUsers.map(u => [u.email.toLowerCase(), u]));
    return tecnici.map(tecnicoDoc => {
      const authUser = authUserMap.get(tecnicoDoc.email.toLowerCase());
      return {
        ...tecnicoDoc,
        authUid: authUser?.uid,
        ruolo: authUser?.ruolo || 'utente',
      };
    });
  }, [tecnici, authUsers]);

  // --- AZIONE DELLO SWITCH (CON CREAZIONE UTENTE) ---
  const handleToggleAccess = async (user: MergedUser) => {
    setOperating(true);

    // CASO 1: L'utente esiste, cambio solo il ruolo
    if (user.authUid) {
      const newRole = user.ruolo === 'tecnico' ? 'utente' : 'tecnico';
      const actionText = newRole === 'tecnico' ? 'Accesso abilitato' : 'Accesso revocato';
      try {
          await manageUsers({ action: 'setRole', payload: { uid: user.authUid, role: newRole } });
          setSnackbar({ open: true, message: `${actionText} per ${user.nome}.`, severity: 'success' });
          fetchData(); 
      } catch (err) {
          handleDetailedError(err, "Modifica Ruolo");
      } finally {
          setOperating(false);
      }
    // CASO 2: L'utente non esiste, lo creo e gli assegno il ruolo
    } else {
      try {
        await manageUsers({ 
            action: 'createUser', 
            payload: { email: user.email, nome: user.nome, cognome: user.cognome }
        });
        setSnackbar({ open: true, message: `Account creato per ${user.nome}. Ora può impostare la password.`, severity: 'success' });
        fetchData(); // Ricarico tutto per avere il nuovo UID e stato
      } catch (err) {
        handleDetailedError(err, "Creazione Utente");
      } finally {
        setOperating(false);
      }
    }
  };

  // --- AZIONE RESET PASSWORD ---
  const handleResetPassword = async (email: string) => {
      if (!window.confirm(`Inviare un'email di ripristino password a ${email}?`)) return;
      setOperating(true);
      try {
          await sendPasswordResetEmail(getAuth(), email);
          setSnackbar({ open: true, message: `Email di ripristino inviata a ${email}.`, severity: 'success' });
      } catch (error: unknown) {
          handleDetailedError(error, "Reset Password");
      } finally {
          setOperating(false);
      }
  };


  // --- COLONNE TABELLA ---
  const columns: GridColDef<MergedUser>[] = [
    { field: 'cognome', headerName: 'Cognome', flex: 1, minWidth: 150 },
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 250 },
    {
      field: 'ruolo',
      headerName: 'Accesso App Mobile',
      width: 180, align: 'center', headerAlign: 'center',
      renderCell: (params: GridRowParams<MergedUser>) => (
        <Tooltip title={params.row.authUid ? (params.row.ruolo === 'tecnico' ? 'Revoca accesso' : 'Abilita accesso') : 'Crea account e abilita accesso' }>
          <Switch
            checked={params.row.ruolo === 'tecnico'}
            onChange={() => handleToggleAccess(params.row)}
            disabled={operating}
          />
        </Tooltip>
      ),
    },
    {
        field: 'actions',
        headerName: 'Azioni',
        sortable: false, disableColumnMenu: true, width: 100, align: 'center', headerAlign: 'center',
        renderCell: (params: GridRowParams<MergedUser>) => (
            <Tooltip title={params.row.authUid ? "Invia Email per impostare/resettare la Password" : "Crea un account per inviare la mail"}>
                <span>
                    <IconButton
                        onClick={() => handleResetPassword(params.row.email)}
                        color="primary"
                        disabled={!params.row.authUid || operating}
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      <Typography variant="h6" gutterBottom>Accesso App Tecnici</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Abilita l'accesso o crea un nuovo account per i tecnici. Invia l'email per impostare la password usando l'icona a chiave.
      </Typography>

      <Box sx={{ flexGrow: 1, width: '100%' }}>
        {loading ? (
          <CircularProgress sx={{ display: 'block', margin: 'auto' }} />
        ) : (
          <DataGrid
              rows={mergedUsers}
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

export default SincronizzatiApp;
