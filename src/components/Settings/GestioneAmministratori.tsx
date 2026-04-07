
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Box, Typography, CircularProgress, Alert, Button, Dialog, 
  DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, 
  Switch, Tooltip, IconButton, Snackbar
} from '@mui/material';
import {
    DataGrid, GridColDef,
    GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import { db, auth } from '@/firebase';

const functions = getFunctions(undefined, 'europe-west1');
const manageAccess = httpsCallable(functions, 'manageAccess');

interface Amministratore {
  id: string;
  nome: string;
  email: string;
  ruolo: string;
  abilitato: boolean;
}

function CustomToolbar({ onAddNew }: { onAddNew: () => void }) {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            <Box sx={{ flexGrow: 1 }} />
            <Button color="primary" startIcon={<AddIcon />} onClick={onAddNew}>
                Nuovo Amministratore
            </Button>
            <GridToolbarQuickFilter sx={{ minWidth: 240, ml: 1 }} placeholder="Cerca..." variant="outlined" size="small" />
        </GridToolbarContainer>
    );
}

const GestioneAmministratori = () => {
  const [amministratori, setAmministratori] = useState<Amministratore[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  
  const [openNewAdminDialog, setOpenNewAdminDialog] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ nome: '', email: '' });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{id: string, email: string} | null>(null);

  useEffect(() => {
    const adminsCollectionRef = collection(db, 'amministratori');
    const unsubscribe = onSnapshot(adminsCollectionRef, (snapshot) => {
        const data: Amministratore[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Amministratore));
        setAmministratori(data);
        setLoading(false);
    }, (err) => {
        console.error("Errore listener Firestore:", err);
        setError("Impossibile caricare i dati in tempo reale.");
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleAbilitato = async (uid: string, currentValue: boolean) => {
    setIsSaving(true);
    try {
      await manageAccess({ 
          action: 'setAdminAbilitato', 
          payload: { uid, abilitato: !currentValue }
      });
      setFeedback({ type: 'success', message: 'Stato amministratore aggiornato con successo.' });
    } catch (err: any) { 
        console.error("ERRORE [Abilitazione Fallita]:", err);
        setFeedback({ type: 'error', message: `Abilitazione Fallita: ${err.message}` });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setFeedback({ type: 'success', message: `Email di reset inviata a ${email}.` });
    } catch (err: any) {
      console.error("Errore invio reset password:", err);
      setFeedback({ type: 'error', message: err.message || 'Impossibile inviare l\'email di reset.' });
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.email || !newAdmin.nome) {
        setFeedback({ type: 'error', message: "Nome e Email sono obbligatori." });
        return;
    }
    setIsSaving(true);
    try {
      await manageAccess({
        action: 'createAdmin',
        payload: { email: newAdmin.email, nome: newAdmin.nome },
      });
      setFeedback({ type: 'success', message: `Privilegi di amministratore concessi a ${newAdmin.nome}.` });
      handleCloseDialog();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || "Impossibile concedere i privilegi." });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirmation = (id: string, email: string) => {
    setAdminToDelete({id, email});
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirmation = () => {
    setAdminToDelete(null);
    setDeleteConfirmOpen(false);
  }

  const confirmDeleteAdmin = async () => {
      if (!adminToDelete) return;
      setIsSaving(true);
      try {
          // Anche questa logica andrebbe spostata nel backend 'manageAccess'
          console.warn("La logica di revoca admin non è ancora supportata dal backend 'manageAccess'.");
          setFeedback({ type: 'warning', message: "Funzionalità non ancora implementata nel backend." });
      } catch (err: any) {
          console.error(err);
          setFeedback({ type: 'error', message: err.message || "Impossibile revocare i privilegi." });
      }
      closeDeleteConfirmation();
      setIsSaving(false);
  }

  const handleOpenDialog = () => setOpenNewAdminDialog(true);
  const handleCloseDialog = () => {
      setOpenNewAdminDialog(false);
      setNewAdmin({ nome: '', email: '' });
  }

  const columns: GridColDef<Amministratore>[] = [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 250 },
    { field: 'ruolo', headerName: 'Ruolo', flex: 0.8, minWidth: 120 },
    {
        field: 'abilitato',
        headerName: 'Abilitato',
        width: 130,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
            <Tooltip title={params.value ? 'Disabilita account (login negato)' : 'Abilita account (login permesso)'}>
                <Switch
                    checked={params.value}
                    onChange={() => handleToggleAbilitato(params.row.id, params.value)}
                    disabled={isSaving}
                />
            </Tooltip>
        )
    },
    {
        field: 'actions',
        headerName: 'Azioni',
        width: 120,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params) => (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Tooltip title="Invia email per reset password">
                  <span>
                    <IconButton 
                      color="primary" 
                      onClick={() => handleSendPasswordReset(params.row.email)}
                      disabled={!params.row.abilitato || isSaving}
                    >
                        <LockResetIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Revoca privilegi di amministratore">
                  <span>
                    <IconButton color="error" onClick={() => openDeleteConfirmation(params.row.id, params.row.email)} disabled={isSaving}>
                        <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
            </Box>
        )
    }
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Gestione Amministratori</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Aggiungi o rimuovi amministratori dal sistema. Le azioni eseguite qui modificano i permessi a livello di autenticazione Firebase.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {feedback && <Snackbar open={true} autoHideDuration={6000} onClose={() => setFeedback(null)}><Alert onClose={() => setFeedback(null)} severity={feedback.type} sx={{ width: '100%' }}>{feedback.message}</Alert></Snackbar>}
      
      <Box sx={{ height: 'auto', width: '100%' }}>
        <DataGrid rows={amministratori} columns={columns} loading={loading || isSaving} getRowId={(row) => row.id} localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'nome', sort: 'asc' }] } }}
            pageSizeOptions={[10, 25, 50]} slots={{ toolbar: CustomToolbar }} slotProps={{ toolbar: { onAddNew: handleOpenDialog } }} disableRowSelectionOnClick autoHeight
        />
      </Box>

      <Dialog open={openNewAdminDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Concedi Privilegi Amministratore</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{mb: 2}}>Inserisci l'email e il nome dell'utente a cui vuoi concedere i privilegi di amministratore. Se l'utente non esiste, verrà creato un account che dovrà essere attivato.</DialogContentText>
          <TextField autoFocus margin="dense" label="Nome" type="text" fullWidth variant="standard" value={newAdmin.nome} onChange={(e) => setNewAdmin({ ...newAdmin, nome: e.target.value })} required />
          <TextField margin="dense" label="Email" type="email" fullWidth variant="standard" value={newAdmin.email} required onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSaving}>Annulla</Button>
          <Button onClick={handleAddAdmin} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Concedi Privilegi'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={closeDeleteConfirmation} maxWidth="xs">
        <DialogTitle>Conferma Rimozione Privilegi</DialogTitle>
        <DialogContent>
          <DialogContentText>Sei sicuro di voler revocare i privilegi a questo amministratore? L'utente non potrà più gestire accessi e anagrafiche, ma il suo account non verrà eliminato.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirmation} disabled={isSaving}>Annulla</Button>
          <Button onClick={confirmDeleteAdmin} color="error" variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Revoca Privilegi'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestioneAmministratori;
