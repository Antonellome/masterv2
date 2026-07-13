
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { auth, db, functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
import PhoneIcon from '@mui/icons-material/Phone';
import EditIcon from '@mui/icons-material/Edit'; // AGGIUNTA MATITA

const gestisciUtenti = httpsCallable(functions, 'amministrazione_gestisciUtenti');

interface User {
  id: string;
  nome: string;
  email: string;
  telefono: string; 
  ruolo: 'admin' | 'user';
}

// --- Dialog Creazione Utente (INVARIATO) ---
const NuovoUtenteDialog = ({ open, onClose, onSave, isSaving }: { open: boolean, onClose: () => void, onSave: (nome: string, email: string, telefono: string) => void, isSaving: boolean }) => {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState(''); 

    const handleSave = () => {
        if (nome && email && telefono) { 
            onSave(nome, email, telefono);
            setNome('');
            setEmail('');
            setTelefono('');
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
            <DialogContent>
                 <DialogContentText sx={{ mb: 2 }}>
                    Verrà creato un nuovo utente e riceverà un'email per impostare la password. Inserisci un numero di telefono valido per l'accesso via SMS.
                </DialogContentText>
                <TextField autoFocus margin="dense" id="name" label="Nome e Cognome" type="text" fullWidth variant="standard" value={nome} onChange={(e) => setNome(e.target.value)} />
                <TextField margin="dense" id="email" label="Indirizzo Email" type="email" fullWidth variant="standard" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField margin="dense" id="telefono" label="Numero di Telefono (es. +393331234567)" type="tel" fullWidth variant="standard" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={handleSave} disabled={isSaving || !nome || !email || !telefono}>
                    {isSaving ? <CircularProgress size={24} /> : 'Salva'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// --- AGGIUNTO DIALOGO PER LA MODIFICA ---
const ModificaUtenteDialog = ({ open, onClose, onSave, isSaving, user }: { open: boolean, onClose: () => void, onSave: (id: string, nome: string, telefono: string) => void, isSaving: boolean, user: User | null }) => {
    const [nome, setNome] = useState('');
    const [telefono, setTelefono] = useState('');

    useEffect(() => {
        if (user) {
            setNome(user.nome || '');
            setTelefono(user.telefono || '');
        }
    }, [user]);

    const handleSave = () => {
        if (user && nome && telefono) {
            onSave(user.id, nome, telefono);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Modifica Utente</DialogTitle>
            <DialogContent>
                 <DialogContentText sx={{ mb: 2 }}>
                    Modifica il nome o il numero di telefono dell'utente. L'email non può essere modificata.
                </DialogContentText>
                <TextField autoFocus margin="dense" id="edit-name" label="Nome e Cognome" type="text" fullWidth variant="standard" value={nome} onChange={(e) => setNome(e.target.value)} />
                <TextField margin="dense" id="edit-email" label="Indirizzo Email" type="email" fullWidth variant="standard" value={user?.email || ''} disabled />
                <TextField margin="dense" id="edit-telefono" label="Numero di Telefono" type="tel" fullWidth variant="standard" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={handleSave} disabled={isSaving || !nome || !telefono}>
                    {isSaving ? <CircularProgress size={24} /> : 'Salva Modifiche'}
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
  const [userToEdit, setUserToEdit] = useState<User | null>(null); // AGGIUNTO stato per modifica

  useEffect(() => {
    setLoading(true);
    const unsubUtentiMaster = onSnapshot(collection(db, 'utenti_master'), (snapshotMaster) => {
        const masterUsers = snapshotMaster.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            telefono: doc.data().telefono || 'N/D'
        } as Omit<User, 'ruolo'>));
        
        const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshotAdmins) => {
            const adminIds = new Set(snapshotAdmins.docs.map(doc => doc.id));
            
            const combinedUsers = masterUsers.map(user => ({
                ...user,
                ruolo: adminIds.has(user.id) ? 'admin' : 'user'
            } as User));

            setUtenti(combinedUsers);
            setLoading(false);
        }, (err) => {
            setError("Impossibile caricare i ruoli degli amministratori.");
            setLoading(false);
        });

        return () => unsubAdmins();
    }, (err) => {
        setError("Impossibile caricare gli utenti.");
        setLoading(false);
    });

    return () => unsubUtentiMaster();
  }, []);

  const handleSendPasswordReset = async (email: string) => {
    if(isSaving) return;
    setIsSaving(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setFeedback({ type: 'success', message: `Email di reset inviata con successo a ${email}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: "Impossibile inviare l'email di reset." });
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

    const originalUtenti = utenti;
    setUtenti(prev => prev.map(u => u.id === user.id ? { ...u, ruolo: nuovoRuolo } : u));

    try {
      const adminDocRef = doc(db, 'admins', user.id);
      if (nuovoRuolo === 'admin') {
        await setDoc(adminDocRef, { email: user.email, nome: user.nome, telefono: user.telefono || 'N/D' });
      } else {
        await deleteDoc(adminDocRef);
      }
      setFeedback({ type: 'success', message: `Ruolo di ${user.nome} aggiornato.` });
    } catch (err: any) {
      setUtenti(originalUtenti); 
      setFeedback({ type: 'error', message: "Modifica ruolo fallita." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreaNuovoUtente = async (nome: string, email: string, telefono: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        await gestisciUtenti({ action: 'createUser', email, nome, telefono });
        setFeedback({ type: 'success', message: `Utente ${nome} creato.` });
        setOpenNewUserDialog(false);
    } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Creazione utente fallita.' });
    } finally {
        setIsSaving(false);
    }
  };

  // --- AGGIUNTA FUNZIONE DI UPDATE ---
  const handleUpdateUtente = async (id: string, nome: string, telefono: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        await gestisciUtenti({ action: 'updateUser', uid: id, nome, telefono });
        setFeedback({ type: 'success', message: `Utente ${nome} aggiornato con successo.` });
        setUserToEdit(null); // Chiudi il dialog
    } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Aggiornamento fallito.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleEliminaUtente = async () => {
    if (!userToDelete || isSaving) return;
    setIsSaving(true);
    try {
        await gestisciUtenti({ action: 'deleteUser', uid: userToDelete.id });
        setFeedback({ type: 'success', message: `Utente ${userToDelete.nome} eliminato.` });
        setUserToDelete(null);
    } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Eliminazione fallita.' });
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
        field: 'telefono',
        headerName: 'Telefono',
        width: 150,
        renderCell: (params) => (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <PhoneIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
                {params.value || 'N/D'}
            </Box>
        )
    },
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
             {/* --- AGGIUNTA MATITA --*/}
            <Tooltip title="Modifica utente">
              <span>
                <IconButton color="secondary" onClick={() => setUserToEdit(params.row)} disabled={isSaving}>
                  <EditIcon />
                </IconButton>
              </span>
            </Tooltip>
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
      <ModificaUtenteDialog open={!!userToEdit} onClose={() => setUserToEdit(null)} onSave={handleUpdateUtente} isSaving={isSaving} user={userToEdit} />
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
