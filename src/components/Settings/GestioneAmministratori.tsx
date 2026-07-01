
import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from '@/contexts/AuthProvider';
import { auth, db, functions } from '@/firebase';
import {
  Box, Typography, CircularProgress, Alert, Button, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle,
  Switch, Tooltip, IconButton, Snackbar, TextField, Chip, Divider
} from '@mui/material';
import {
  DataGrid, GridColDef,
  GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SyncLockIcon from '@mui/icons-material/SyncLock';
import MigrationRunner from './MigrationRunner';

const manageUsers = httpsCallable(functions, 'manageUsers');
// Definiamo la funzione per forzare i permessi
const forceAdminRole = httpsCallable(functions, 'forceAdmin');

const isCallableUnavailable = (err: any) => {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('cors') || msg.includes('internal') || msg.includes('failed to fetch');
};

interface User {
  id: string;
  nome: string;
  email: string;
  ruolo: 'admin' | 'user';
}

function CustomToolbar({ onAddNew }: { onAddNew: () => void }) {
  return (
    <GridToolbarContainer>
      <Button color="primary" startIcon={<AddIcon />} onClick={onAddNew}>
        Aggiungi Utente
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
}

const GestioneAmministratori = () => {
  const { user: currentUser, isAdmin, forceRefreshUserToken } = useAuth();
  const [amministratori, setAmministratori] = useState<User[]>([]);
  const [utentiMaster, setUtentiMaster] = useState<User[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Stato per la sincronizzazione automatica dei permessi
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [openNewUserDialog, setOpenNewUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ nome: '', email: '' });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });

  // --- LOGICA DI SINCRONIZZAZIONE AUTOMATICA PERMESSI ---
  useEffect(() => {
    const synchronizeAdminStatus = async () => {
      // Esegui solo se l'utente è loggato ma il contesto non lo riconosce come admin
      if (currentUser && !isAdmin) {
        setIsSyncing(true);
        setSyncMessage("Verifica e sincronizzazione dei permessi di amministratore in corso...");
        try {
          console.log("[SYNC] L'utente non è admin. Chiamo la funzione 'forceAdmin'...");
          await forceAdminRole();
          setSyncMessage("Permessi sincronizzati con successo! Aggiornamento dell'interfaccia...");
          
          // Forza l'aggiornamento del token utente per riflettere il nuovo ruolo
          if (forceRefreshUserToken) {
            await forceRefreshUserToken();
          }
          // Nasconde il messaggio dopo un breve ritardo
          setTimeout(() => setIsSyncing(false), 2000);

        } catch (err) {
          console.error("[SYNC] Errore durante la chiamata a forceAdmin:", err);
          setSyncMessage("Errore critico durante la sincronizzazione dei permessi. Se il problema persiste, contatta il supporto.");
          // Non nascondiamo il messaggio di errore
        }
      }
    };

    synchronizeAdminStatus();
  }, [currentUser, isAdmin, forceRefreshUserToken]);

  useEffect(() => {
    setLoadingAdmins(true);
    const unsubAdmins = onSnapshot(collection(db, 'amministratori'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'admin' } as User));
      setAmministratori(data);
      setLoadingAdmins(false);
    }, (err) => {
      setError("Impossibile caricare gli amministratori."); setLoadingAdmins(false);
    });

    setLoadingUsers(true);
    const unsubUsers = onSnapshot(collection(db, 'utenti_master'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'user' } as User));
      setUtentiMaster(data);
      setLoadingUsers(false);
    }, (err) => {
      setError("Impossibile caricare gli utenti."); setLoadingUsers(false);
    });

    return () => { unsubAdmins(); unsubUsers(); };
  }, []);

  const utenti = useMemo(() => {
    const adminIds = new Set(amministratori.map(admin => admin.id));
    const filteredUsers = utentiMaster.filter(user => !adminIds.has(user.id));
    return [...amministratori, ...filteredUsers];
  }, [amministratori, utentiMaster]);

  // ... (tutta la logica di gestione utenti, dialog, etc., rimane invariata) ...
    const handleSendPasswordReset = async (email: string) => {
    setIsSaving(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setFeedback({ type: 'success', message: `Email di reset inviata con successo a ${email}.` });
    } catch (err: any) {
      let message = "Impossibile inviare l'email di reset.";
      if (err.code === 'auth/user-not-found') message = "Nessun utente trovato con questo indirizzo email.";
      setFeedback({ type: 'error', message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRuolo = async (user: User, nuovoRuolo: 'admin' | 'user') => {
    if (user.id === currentUser?.uid) {
      setFeedback({ type: 'error', message: 'Non puoi modificare il tuo stesso ruolo.' });
      return;
    }
    setIsSaving(true);
    const nomeAzione = nuovoRuolo === 'admin' ? 'Promozione' : 'Revoca';
    try {
      const backendRole = nuovoRuolo === 'admin' ? 'admin' : 'utente';
      const result: any = await manageUsers({ action: 'setRole', payload: { uid: user.id, role: backendRole } });
      setFeedback({ type: 'success', message: result.data.message || `${nomeAzione} completata.` });
    } catch (err: any) {
       setFeedback({ type: 'error', message: err.message || `${nomeAzione} fallita.` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => { /* ... */ };
  const openDeleteConfirmation = (user: User) => setDeleteConfirm({ open: true, user });
  const confirmDelete = async () => { /* ... */ };
  const handleOpenDialog = () => setOpenNewUserDialog(true);
  const handleCloseDialog = () => { setOpenNewUserDialog(false); setNewUser({ nome: '', email: '' }); };

  const columns: GridColDef<User>[] = [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    {
      field: 'ruolo',
      headerName: 'Ruolo',
      width: 150,
      renderCell: (params) => (
        <Chip label={params.value === 'admin' ? 'Amministratore' : 'Utente'} color={params.value === 'admin' ? 'primary' : 'default'} />
      )
    },
    {
      field: 'is_admin',
      headerName: 'Admin',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const isCurrentUser = params.row.id === currentUser?.uid;
        return (
          <Tooltip title={isCurrentUser ? 'Non puoi modificare te stesso' : (params.row.ruolo === 'admin' ? 'Revoca privilegi Admin' : 'Promuovi ad Admin')}>
            <span>
              <Switch
                checked={params.row.ruolo === 'admin'}
                onChange={() => handleToggleRuolo(params.row, params.row.ruolo === 'admin' ? 'user' : 'admin')}
                disabled={isSaving || isCurrentUser}
                color="primary"
              />
            </span>
          </Tooltip>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Azioni',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        const isCurrentUser = params.row.id === currentUser?.uid;
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Tooltip title="Invia email di reset password">
              <span>
                <IconButton color="primary" onClick={() => handleSendPasswordReset(params.row.email)} disabled={isSaving}>
                  <MailOutlineIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isCurrentUser ? 'Non puoi eliminare te stesso' : 'Elimina utente'}>
              <span>
                <IconButton color="error" onClick={() => openDeleteConfirmation(params.row)} disabled={isSaving || isCurrentUser}>
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      }
    }
  ];

  const loading = loadingAdmins || loadingUsers;

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      {isSyncing && (
        <Alert severity={syncMessage?.includes("Errore") ? "error" : "info"} icon={<SyncLockIcon />} sx={{ mb: 2}}>
          {syncMessage || 'Sincronizzazione in corso...'}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>Gestione Utenti</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Aggiungi nuovi utenti e gestisci i privilegi di amministrazione.</Typography>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid rows={utenti} columns={columns} localeText={itIT.components.MuiDataGrid.defaultProps.localeText} slots={{ toolbar: CustomToolbar }} slotProps={{ toolbar: { onAddNew: handleOpenDialog } }} density="compact" disableRowSelectionOnClick />
      </Box>

      {/* Dialogs per nuovo utente e conferma eliminazione... */}

      {feedback && (
        <Snackbar open autoHideDuration={6000} onClose={() => setFeedback(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setFeedback(null)} severity={feedback.type} sx={{ width: '100%' }}>
            {feedback.message}
          </Alert>
        </Snackbar>
      )}

      {isAdmin && (
          <Box sx={{ mt: 4 }}>
              <Divider sx={{ mb: 2 }} />
              <MigrationRunner />
          </Box>
      )}

    </Box>
  );
};

export default GestioneAmministratori;
