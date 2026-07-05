
import React, { useState, useEffect, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from '@/contexts/AuthProvider';
import { auth, db, functions } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Box, Typography, CircularProgress, Alert, Button, Dialog,
  DialogActions, DialogContent, DialogTitle,
  Switch, Tooltip, IconButton, Snackbar, Chip
} from '@mui/material';
import {
  DataGrid, GridColDef,
  GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

// Funzione corretta e stabile per la gestione utenti
const gestisciUtenti = httpsCallable(functions, 'amministrazione_gestisciUtenti');

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
  const [utenti, setUtenti] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [openNewUserDialog, setOpenNewUserDialog] = useState(false); // Logica per nuovo utente da implementare

  useEffect(() => {
    setLoading(true);
    // Combiniamo le letture per semplicità e coerenza dei dati
    const unsubAdmins = onSnapshot(collection(db, 'amministratori'), (adminSnapshot) => {
      const admins = adminSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'admin' } as User));
      
      const unsubUsers = onSnapshot(collection(db, 'utenti_master'), (userSnapshot) => {
        const masterUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'user' } as User));
        
        // Uniamo le liste, dando priorità agli admin in caso di duplicati
        const adminIds = new Set(admins.map(a => a.id));
        const combinedUsers = [
          ...admins,
          ...masterUsers.filter(u => !adminIds.has(u.id))
        ];

        setUtenti(combinedUsers);
        setLoading(false);
      }, (err) => {
        console.error("Errore caricamento utenti master:", err);
        setError("Impossibile caricare gli utenti.");
        setLoading(false);
      });

      return () => unsubUsers();
    }, (err) => {
      console.error("Errore caricamento amministratori:", err);
      setError("Impossibile caricare gli amministratori.");
      setLoading(false);
    });

    return () => unsubAdmins();
  }, []);

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
      const result: any = await gestisciUtenti({ 
        action: 'setRole', 
        uid: user.id,
        role: nuovoRuolo
      });
      setFeedback({ type: 'success', message: result.data.message || `${nomeAzione} completata.` });
    } catch (err: any) {
       setFeedback({ type: 'error', message: err.message || `${nomeAzione} fallita.` });
    } finally {
      setIsSaving(false);
    }
  };

  // Funzioni placeholder per azioni non ancora implementate
  const handleOpenDialog = () => setOpenNewUserDialog(true);
  const handleCloseDialog = () => setOpenNewUserDialog(false);
  const openDeleteConfirmation = (user: User) => alert(`Logica di eliminazione per ${user.nome} da implementare.`);

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

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Gestione Utenti</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Aggiungi nuovi utenti e gestisci i privilegi di amministrazione.</Typography>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid rows={utenti} columns={columns} localeText={itIT.components.MuiDataGrid.defaultProps.localeText} slots={{ toolbar: CustomToolbar }} slotProps={{ toolbar: { onAddNew: handleOpenDialog } }} density="compact" disableRowSelectionOnClick />
      </Box>

      {/* Placeholder per il dialog di creazione utente */}
      <Dialog open={openNewUserDialog} onClose={handleCloseDialog}>
        <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            La logica per la creazione di un nuovo utente e l'invio dell'invito non è ancora stata implementata in questa interfaccia.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annulla</Button>
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
