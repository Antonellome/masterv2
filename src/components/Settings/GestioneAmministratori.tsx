
import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from '@/contexts/AuthProvider';
import { auth, db, functions } from '@/firebase';
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
import MailOutlineIcon from '@mui/icons-material/MailOutline';

const manageUsers = httpsCallable(functions, 'manageUsers');

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
  const { user: currentUser } = useAuth();
  const [amministratori, setAmministratori] = useState<User[]>([]);
  const [utentiMaster, setUtentiMaster] = useState<User[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
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
    const unsubUsers = onSnapshot(collection(db, 'utenti_master'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'user' } as User));
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

  const utenti = useMemo(() => {
    const adminIds = new Set(amministratori.map(admin => admin.id));
    const filteredUsers = utentiMaster.filter(user => !adminIds.has(user.id));
    return [...amministratori, ...filteredUsers];
  }, [amministratori, utentiMaster]);

  const handleSendPasswordReset = async (email: string) => {
    setIsSaving(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setFeedback({ type: 'success', message: `Email di reset inviata con successo a ${email}.` });
    } catch (err: any) {
      console.error("Errore invio email di reset:", err);
      let message = "Impossibile inviare l'email di reset.";
      if (err.code === 'auth/user-not-found') {
          message = "Nessun utente trovato con questo indirizzo email.";
      }
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
      setUtentiMaster((prev) => prev.map((u) => u.id === user.id ? { ...u, ruolo: nuovoRuolo } : u));
      setAmministratori((prev) => {
        if (nuovoRuolo === 'admin') {
          const promoted = utentiMaster.find((u) => u.id === user.id) || user;
          if (prev.some((a) => a.id === user.id)) return prev;
          return [...prev, { ...promoted, ruolo: 'admin' }];
        }
        return prev.filter((a) => a.id !== user.id);
      });
      setFeedback({ type: 'success', message: result.data.message || `${nomeAzione} completata.` });
    } catch (err: any) {
      if (isCallableUnavailable(err)) {
        try {
          if (nuovoRuolo === 'admin') {
            const fromRef = doc(db, 'utenti_master', user.id);
            const fromSnap = await getDoc(fromRef);
            const payload = fromSnap.exists() ? fromSnap.data() : { nome: user.nome, email: user.email };
            await setDoc(doc(db, 'amministratori', user.id), payload);
            await deleteDoc(fromRef).catch(() => undefined);
          } else {
            const fromRef = doc(db, 'amministratori', user.id);
            const fromSnap = await getDoc(fromRef);
            const payload = fromSnap.exists() ? fromSnap.data() : { nome: user.nome, email: user.email };
            await setDoc(doc(db, 'utenti_master', user.id), payload);
            await deleteDoc(fromRef).catch(() => undefined);
          }
          setFeedback({ type: 'success', message: `${nomeAzione} completata (fallback locale).` });
        } catch (fallbackErr: any) {
          console.error(`ERRORE [${nomeAzione} fallback Fallita]:`, fallbackErr);
          setFeedback({ type: 'error', message: fallbackErr?.message || `${nomeAzione} fallita.` });
        }
      } else {
        console.error(`ERRORE [${nomeAzione} Fallita]:`, err);
        setFeedback({ type: 'error', message: err.message || `${nomeAzione} fallita.` });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.nome || !newUser.email) {
      setFeedback({ type: 'error', message: "Nome e email sono obbligatori." });
      return;
    }
    setIsSaving(true);
    try {
      const result: any = await manageUsers({ action: 'createUser', payload: newUser });
      setFeedback({ type: 'success', message: result.data.message || 'Utente creato con successo.' });
      handleCloseDialog();
    } catch (err: any) {
      if (isCallableUnavailable(err)) {
        try {
          await addDoc(collection(db, 'utenti_master'), {
            nome: newUser.nome,
            email: newUser.email,
          });
          setFeedback({ type: 'success', message: 'Utente creato (fallback locale).' });
          handleCloseDialog();
        } catch (fallbackErr: any) {
          console.error(fallbackErr);
          setFeedback({ type: 'error', message: fallbackErr?.message || "Impossibile creare l'utente." });
        }
      } else {
        console.error(err);
        setFeedback({ type: 'error', message: err.message || "Impossibile creare l'utente." });
      }
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
      const result: any = await manageUsers({ action: 'deleteUser', payload: { uid: userToDelete.id } });
      setFeedback({ type: 'success', message: result.data.message || 'Utente eliminato.' });
    } catch (err: any) {
      if (isCallableUnavailable(err)) {
        try {
          const fromCollection = userToDelete.ruolo === 'admin' ? 'amministratori' : 'utenti_master';
          await deleteDoc(doc(db, fromCollection, userToDelete.id));
          setFeedback({ type: 'success', message: 'Utente eliminato (fallback locale).' });
        } catch (fallbackErr: any) {
          console.error(fallbackErr);
          setFeedback({ type: 'error', message: fallbackErr?.message || "Impossibile eliminare l'utente." });
        }
      } else {
        console.error(err);
        setFeedback({ type: 'error', message: err.message || "Impossibile eliminare l'utente." });
      }
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
      <Typography variant="h6" gutterBottom>Gestione Utenti</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Aggiungi nuovi utenti (nessun privilegio) e promuovili ad amministratori.</Typography>

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

      <Dialog open={openNewUserDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>L'utente verrà aggiunto alla lista e potrà essere promosso ad amministratore.</DialogContentText>
          <TextField autoFocus margin="dense" label="Nome e Cognome" type="text" fullWidth variant="standard" value={newUser.nome} onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })} />
          <TextField margin="dense" label="Indirizzo Email" type="email" fullWidth variant="standard" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
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
        <Snackbar open autoHideDuration={6000} onClose={() => setFeedback(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setFeedback(null)} severity={feedback.type} sx={{ width: '100%' }}>
            {feedback.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default GestioneAmministratori;
