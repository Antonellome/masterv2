
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from '@/contexts/AuthProvider';
import { auth, db, functions } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Box, Typography, CircularProgress, Alert, Button, Dialog,
  DialogActions, DialogContent, DialogTitle, DialogContentText,
  Switch, Tooltip, IconButton, Snackbar, Chip, TextField
} from '@mui/material';
import {
  DataGrid, GridColDef,
  GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

const gestisciUtenti = httpsCallable(functions, 'amministrazione_gestisciUtenti');

interface User {
  id: string;
  nome: string;
  email: string;
  ruolo: 'admin' | 'user';
}

const NuovoUtenteDialog = ({ open, onClose, onSave, isSaving }: { open: boolean, onClose: () => void, onSave: (nome: string, email: string) => void, isSaving: boolean }) => {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');

    const handleSave = () => {
        if (nome && email) {
            onSave(nome, email);
            setNome('');
            setEmail('');
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Verrà creato un nuovo utente e riceverà un'email per impostare la propria password. Inizialmente, avrà il ruolo di 'Utente'.
                </DialogContentText>
                <TextField autoFocus margin="dense" id="name" label="Nome e Cognome" type="text" fullWidth variant="standard" value={nome} onChange={(e) => setNome(e.target.value)} />
                <TextField margin="dense" id="email" label="Indirizzo Email" type="email" fullWidth variant="standard" value={email} onChange={(e) => setEmail(e.target.value)} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={handleSave} disabled={isSaving || !nome || !email}>
                    {isSaving ? <CircularProgress size={24} /> : 'Salva'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const ConfermaEliminazioneDialog = ({ open, onClose, onConfirm, isSaving, user }: { open: boolean, onClose: () => void, onConfirm: () => void, isSaving: boolean, user: User | null }) => (
    <Dialog open={open} onClose={onClose}>
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
            <DialogContentText dangerouslySetInnerHTML={{ __html: `Sei sicuro di voler eliminare definitivamente l'utente <strong>${user?.nome}</strong> (${user?.email})? L'azione è irreversibile.` }} />
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
            <Button onClick={onConfirm} color="error" disabled={isSaving}>
                {isSaving ? <CircularProgress size={24} /> : 'Elimina'}
            </Button>
        </DialogActions>
    </Dialog>
);


const GestioneAmministratori = () => {
  const { user: currentUser } = useAuth();
  const [utenti, setUtenti] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [openNewUserDialog, setOpenNewUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null); 

  useEffect(() => {
    setLoading(true);
    const unsubAdmins = onSnapshot(collection(db, 'amministratori'), (adminSnapshot) => {
      const admins = adminSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'admin' } as User));
      
      const unsubUsers = onSnapshot(collection(db, 'utenti_master'), (userSnapshot) => {
        const masterUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), ruolo: 'user' } as User));
        
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
    if(isSaving) return;
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
    if (isSaving) return;
    setIsSaving(true);

    // Aggiornamento ottimistico dell'interfaccia UTENTE - L'HO RIMESSO, CAZZO.
    const originalUtenti = utenti;
    setUtenti(prev => prev.map(u => u.id === user.id ? { ...u, ruolo: nuovoRuolo } : u));

    try {
      await gestisciUtenti({ action: 'setRole', uid: user.id, role: nuovoRuolo });
      const feedbackMessage = `Ruolo di ${user.nome} aggiornato a ${nuovoRuolo === 'admin' ? 'Amministratore' : 'Utente'}.`;
      setFeedback({ type: 'success', message: feedbackMessage });
    } catch (err: any) {
      // Rollback in caso di errore
      setUtenti(originalUtenti);
      const nomeAzione = nuovoRuolo === 'admin' ? 'Promozione' : 'Revoca';
      setFeedback({ type: 'error', message: err.message || `${nomeAzione} fallita.` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreaNuovoUtente = async (nome: string, email: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        await gestisciUtenti({ action: 'createUser', email, nome });
        setFeedback({ type: 'success', message: `Utente ${nome} creato. Riceverà un'email per impostare la password.` });
        setOpenNewUserDialog(false);
    } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Creazione utente fallita.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleEliminaUtente = async () => {
    if (!userToDelete || isSaving) return;
    setIsSaving(true);
    const userNome = userToDelete.nome;
    try {
        await gestisciUtenti({ action: 'deleteUser', uid: userToDelete.id });
        setFeedback({ type: 'success', message: `Utente ${userNome} eliminato con successo.` });
        setUserToDelete(null);
    } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Eliminazione fallita.' });
        setUserToDelete(null);
    } finally {
        setIsSaving(false);
    }
  };
  
  function CustomToolbar() {
      return (
          <GridToolbarContainer>
              <Button color="primary" startIcon={<AddIcon />} onClick={() => setOpenNewUserDialog(true)}>
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

  const columns: GridColDef<User>[] = [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    {
      field: 'ruolo',
      headerName: 'Ruolo',
      width: 150,
      renderCell: (params) => (
        <Chip label={params.value === 'admin' ? 'Amministratore' : 'Utente'} color={params.value === 'admin' ? 'primary' : 'default'} size="small"/>
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
                <IconButton color="error" onClick={() => setUserToDelete(params.row)} disabled={isSaving || isCurrentUser}>
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      }
    }
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Gestione Utenti</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Aggiungi nuovi utenti e gestisci i privilegi di amministrazione.</Typography>

      <Box sx={{ height: 650, width: '100%' }}>
         <DataGrid 
            rows={utenti} 
            columns={columns} 
            localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
            slots={{ toolbar: CustomToolbar }} 
            density="compact" 
            disableRowSelectionOnClick 
        />
      </Box>

      <NuovoUtenteDialog open={openNewUserDialog} onClose={() => setOpenNewUserDialog(false)} onSave={handleCreaNuovoUtente} isSaving={isSaving} />
      <ConfermaEliminazioneDialog open={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={handleEliminaUtente} isSaving={isSaving} user={userToDelete} />

      {feedback && (
        <Snackbar open autoHideDuration={6000} onClose={() => setFeedback(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setFeedback(null)} severity={feedback.type} sx={{ width: '100%', boxShadow: 6 }}>
            {feedback.message}
          </Alert>
        </Snackbar>
      )}

    </Box>
  );
};

export default GestioneAmministratori;
