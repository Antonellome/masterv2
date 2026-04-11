
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthProvider';
import {
  Box, Typography, CircularProgress, Alert, Button, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle,
  Switch, Tooltip, IconButton, Snackbar, TextField, Chip
} from '@mui/material';
import {
  DataGrid, GridColDef,
  GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '@/firebase';

const functions = getFunctions(undefined, 'europe-west1');
const manageAccess = httpsCallable(functions, 'manageAccess');

// 1. Change terminology in the interface
interface User {
  id: string;
  nome: string;
  email: string;
  ruolo: 'admin' | 'user'; // Changed from 'candidato'
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
  const { user: currentUser } = useAuth();
  const [amministratori, setAmministratori] = useState<User[]>([]);
  const [utentiMaster, setUtentiMaster] = useState<User[]>([]); // Renamed from 'candidati' for clarity
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true); // Renamed for clarity
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [openNewUserDialog, setOpenNewUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ nome: '', email: '' });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });

  useEffect(() => {
    setLoadingAdmins(true);
    const unsubAdmins = onSnapshot(collection(db, 'amministratori'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'admin' } as User));
      setAmministratori(data);
      setLoadingAdmins(false);
    }, (err) => {
      console.error("Errore listener amministratori:", err);
      setError("Impossibile caricare gli amministratori.");
      setLoadingAdmins(false);
    });

    setLoadingUsers(true);
    // Listen to 'utenti_master' which represents regular users
    const unsubUsers = onSnapshot(collection(db, 'utenti_master'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'user' } as User)); // Set ruolo to 'user'
      setUtentiMaster(data);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Errore listener utenti:", err);
      setError("Impossibile caricare gli utenti.");
      setLoadingUsers(false);
    });

    return () => {
      unsubAdmins();
      unsubUsers();
    };
  }, []);

  // 2. Fix the Race Condition with robust merging logic
  const utenti = useMemo(() => {
    const adminIds = new Set(amministratori.map(admin => admin.id));
    // Filter out users from the master list if they are already admins
    const filteredUsers = utentiMaster.filter(user => !adminIds.has(user.id));
    // Combine the two lists, with admins taking precedence
    return [...amministratori, ...filteredUsers];
  }, [amministratori, utentiMaster]);

  const handleToggleRuolo = async (user: User, nuovoRuolo: 'admin' | 'user') => {
    if (user.id === currentUser?.uid) {
      setFeedback({ type: 'error', message: 'Non puoi modificare il tuo stesso ruolo.' });
      return;
    }

    setIsSaving(true);
    // The backend function still uses 'demoteToCandidate', I'll keep that for now to avoid breaking changes there.
    // The user doesn't see this.
    const action = nuovoRuolo === 'admin' ? 'promoteToAdmin' : 'demoteToCandidate';
    const nomeAzione = nuovoRuolo === 'admin' ? 'Promozione' : 'Revoca';

    try {
      const result: any = await manageAccess({
        action: action,
        payload: { uid: user.id }
      });
      setFeedback({ type: 'success', message: result.data.message || `${nomeAzione} completata.` });
    } catch (err: any) {
      console.error(`ERRORE [${nomeAzione} Fallita]:`, err);
      setFeedback({ type: 'error', message: err.message || `${nomeAzione} fallita.` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => { // Renamed from handleCreateCandidate
    if (!newUser.nome || !newUser.email) {
      setFeedback({ type: 'error', message: "Nome e email sono obbligatori." });
      return;
    }
    setIsSaving(true);
    try {
      // The backend function is named 'createCandidate', which is fine.
      const result: any = await manageAccess({
        action: 'createCandidate',
        payload: newUser,
      });
      setFeedback({ type: 'success', message: result.data.message || 'Utente creato con successo.' });
      handleCloseDialog();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || "Impossibile creare l'utente." });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirmation = (user: User) => {
    setDeleteConfirm({ open: true, user });
  };

  const confirmDelete = async () => {
    const userToDelete = deleteConfirm.user;
    if (!userToDelete) return;

    if (userToDelete.id === currentUser?.uid) {
      setFeedback({ type: 'error', message: 'Non puoi eliminare te stesso.' });
      setDeleteConfirm({ open: false, user: null });
      return;
    }

    setIsSaving(true);
    try {
      // Determine the collection based on the user's role
      const fromCollection = userToDelete.ruolo === 'admin' ? 'amministratori' : 'utenti_master';
      const result: any = await manageAccess({ action: 'deleteUser', payload: { uid: userToDelete.id, fromCollection: fromCollection } });
      setFeedback({ type: 'success', message: result.data.message || 'Utente eliminato.' });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || "Impossibile eliminare l'utente." });
    }
    setDeleteConfirm({ open: false, user: null });
    setIsSaving(false);
  }

  const handleOpenDialog = () => setOpenNewUserDialog(true);
  const handleCloseDialog = () => {
    setOpenNewUserDialog(false);
    setNewUser({ nome: '', email: '' });
  }

  const columns: GridColDef<User>[] = [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    {
      field: 'ruolo',
      headerName: 'Ruolo',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value === 'admin' ? 'Amministratore' : 'Utente'} // 3. Update Label
          color={params.value === 'admin' ? 'primary' : 'default'}
        />
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
      width: 100,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        const isCurrentUser = params.row.id === currentUser?.uid;
        return (
          <Tooltip title={isCurrentUser ? 'Non puoi eliminare te stesso' : 'Elimina utente'}>
            <span>
              <IconButton color="error" onClick={() => openDeleteConfirmation(params.row)} disabled={isSaving || isCurrentUser}>
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        );
      }
    }
  ];

  const loading = loadingAdmins || loadingUsers;

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Gestione Utenti</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Aggiungi nuovi utenti o promuovili ad amministratori.</Typography>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={utenti}
          columns={columns}
          localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
          slots={{ toolbar: CustomToolbar }}
          slotProps={{
            toolbar: { onAddNew: handleOpenDialog },
          }}
          density="compact"
          disableRowSelectionOnClick
        />
      </Box>

      {/* 4. Update Dialog Title and Text */}
      <Dialog open={openNewUserDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>L'utente verrà aggiunto alla lista e potrà essere promosso ad amministratore.</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Nome e Cognome"
            type="text"
            fullWidth
            variant="standard"
            value={newUser.nome}
            onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Indirizzo Email"
            type="email"
            fullWidth
            variant="standard"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSaving}>Annulla</Button>
          <Button onClick={handleCreateUser} disabled={isSaving || !newUser.nome || !newUser.email}>{isSaving ? <CircularProgress size={24} /> : 'Crea Utente'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, user: null })} maxWidth="xs">
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
          <DialogContentText>Sei sicuro di voler eliminare l'utente <b>{deleteConfirm.user?.nome}</b>? L'azione è irreversibile e l'utente verrà disabilitato.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, user: null })} disabled={isSaving}>Annulla</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Elimina Definitivamente'}</Button>
        </DialogActions>
      </Dialog>

      {feedback && (
        <Snackbar
          open
          autoHideDuration={6000}
          onClose={() => setFeedback(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setFeedback(null)} severity={feedback.type} sx={{ width: '100%' }}>
            {feedback.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default GestioneAmministratori;
