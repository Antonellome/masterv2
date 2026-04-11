
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Box, Typography, CircularProgress, Alert, Button, Dialog, 
  DialogActions, DialogContent, DialogContentText, DialogTitle, 
  Switch, Tooltip, IconButton, Snackbar, Autocomplete, TextField
} from '@mui/material';
import {
    DataGrid, GridColDef,
    GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import { db } from '@/firebase';

const functions = getFunctions(undefined, 'europe-west1');
const manageAccess = httpsCallable(functions, 'manageAccess');

interface Amministratore {
  id: string;
  nome: string;
  email: string;
  ruolo: string;
  abilitato: boolean;
}

interface UtenteMaster {
    id: string;
    nome: string;
    email: string;
}

function CustomToolbar({ onAddNew }: { onAddNew: () => void }) {
  return (
    <GridToolbarContainer>
        <Button color="primary" startIcon={<AddIcon />} onClick={onAddNew}>
            Nuovo Amministratore
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
  const [amministratori, setAmministratori] = useState<Amministratore[]>([]);
  const [utentiMaster, setUtentiMaster] = useState<UtenteMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [openNewAdminDialog, setOpenNewAdminDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UtenteMaster | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);

  // Carica amministratori e utenti master
  useEffect(() => {
    setLoading(true);
    const unsubAdmins = onSnapshot(collection(db, 'amministratori'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Amministratore));
        setAmministratori(data);
        setLoading(false);
    }, (err) => {
        console.error("Errore listener amministratori:", err);
        setError("Impossibile caricare gli amministratori.");
        setLoading(false);
    });

    return () => unsubAdmins();
  }, []);

  // Carica la lista degli utenti master solo quando il dialogo si apre
  useEffect(() => {
    if (openNewAdminDialog) {
        const fetchUtenti = async () => {
            const querySnapshot = await getDocs(collection(db, "utenti_master"));
            const utentiData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UtenteMaster));
            setUtentiMaster(utentiData);
        };
        fetchUtenti();
    }
  }, [openNewAdminDialog]);

  const utentiCandidati = useMemo(() => {
    const adminIds = new Set(amministratori.map(a => a.id));
    return utentiMaster.filter(u => !adminIds.has(u.id));
  }, [utentiMaster, amministratori]);


  const handleToggleAbilitato = async (uid: string, currentValue: boolean) => {
    setIsSaving(true);
    try {
      await manageAccess({ 
          action: 'setAdminAbilitato', 
          payload: { uid, abilitato: !currentValue }
      });
      setFeedback({ type: 'success', message: 'Stato amministratore aggiornato.' });
    } catch (err: any) { 
        console.error("ERRORE [Abilitazione Fallita]:", err);
        setFeedback({ type: 'error', message: err.message || `Abilitazione Fallita.` });
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedUser) {
        setFeedback({ type: 'error', message: "Seleziona un utente dalla lista." });
        return;
    }
    setIsSaving(true);
    try {
      await manageAccess({
        action: 'createAdmin',
        payload: { email: selectedUser.email, nome: selectedUser.nome },
      });
      setFeedback({ type: 'success', message: `Privilegi concessi a ${selectedUser.nome}.` });
      handleCloseDialog();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || "Impossibile concedere i privilegi." });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirmation = (id: string) => {
    setAdminToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAdmin = async () => {
      if (!adminToDelete) return;
      setIsSaving(true);
      try {
          await manageAccess({ action: 'revokeAdmin', payload: { uid: adminToDelete } });
          setFeedback({ type: 'success', message: 'Privilegi di amministratore revocati.' });
      } catch (err: any) {
          console.error(err);
          setFeedback({ type: 'error', message: err.message || "Impossibile revocare i privilegi." });
      }
      setDeleteConfirmOpen(false);
      setAdminToDelete(null);
      setIsSaving(false);
  }

  const handleOpenDialog = () => setOpenNewAdminDialog(true);
  const handleCloseDialog = () => {
      setOpenNewAdminDialog(false);
      setSelectedUser(null);
  }
  
  const columns: GridColDef<Amministratore>[] = [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'ruolo', headerName: 'Ruolo', width: 130 },
    {
        field: 'abilitato',
        headerName: 'Abilitato',
        width: 130,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
            <Tooltip title={params.value ? 'Disabilita utente' : 'Abilita utente'}>
                <Switch
                    checked={params.value}
                    onChange={() => handleToggleAbilitato(params.row.id, params.value)}
                    disabled={isSaving}
                    color="primary"
                />
            </Tooltip>
        ),
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
                <Tooltip title="Revoca privilegi di amministratore">
                  <span>
                    <IconButton color="error" onClick={() => openDeleteConfirmation(params.row.id)} disabled={isSaving}>
                        <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
            </Box>
        )
    }
  ];

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
        <Typography variant="h6" gutterBottom>Gestione Accessi Amministratori</Typography>
        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>Aggiungi, rimuovi o disabilita gli utenti con privilegi di amministrazione.</Typography>

        <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={amministratori}
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

      <Dialog open={openNewAdminDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Concedi Privilegi Amministratore</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{mb: 2}}>Seleziona un utente dall'anagrafica per concedergli i privilegi. L'utente potrà gestire accessi, anagrafiche e altre impostazioni critiche.</DialogContentText>
          <Autocomplete
            options={utentiCandidati}
            getOptionLabel={(option) => `${option.nome} (${option.email})`}
            value={selectedUser}
            onChange={(event, newValue) => {
              setSelectedUser(newValue);
            }}
            renderInput={(params) => <TextField {...params} label="Seleziona Utente" variant="standard" />}
            noOptionsText="Nessun utente candidabile"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSaving}>Annulla</Button>
          <Button onClick={handleAddAdmin} disabled={isSaving || !selectedUser}>{isSaving ? <CircularProgress size={24} /> : 'Concedi Privilegi'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Conferma Rimozione Privilegi</DialogTitle>
        <DialogContent>
          <DialogContentText>Sei sicuro di voler revocare i privilegi a questo amministratore? L'utente non potrà più accedere a questa console.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isSaving}>Annulla</Button>
          <Button onClick={confirmDeleteAdmin} color="error" variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Revoca Privilegi'}</Button>
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
