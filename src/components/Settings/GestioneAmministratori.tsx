
import React, { useState, useEffect } from 'react';
import { useGlobalStore } from '@/stores/globalStore'; // SOSTITUITO
import { functions } from '@/firebase'; // Rimosso auth, db non necessari direttamente qui
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail, getAuth } from "firebase/auth"; // getAuth importato per l'azione di reset
import { collection, onSnapshot, getFirestore } from 'firebase/firestore'; // getFirestore importato
import {
  Box, Typography, CircularProgress, Alert, Button,
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
import EditIcon from '@mui/icons-material/Edit';

import { NuovoUtenteDialog, ModificaUtenteDialog, ConfermaEliminazioneDialog } from './AmministratoriDialogs';

const gestisciUtenti = httpsCallable(functions, 'amministrazione_gestisciUtenti');

interface User {
  id: string;
  nome: string;
  email: string;
  ruolo: 'admin' | 'user';
}

const GestioneAmministratori = () => {
  const currentUser = useGlobalStore(state => state.user); // SOSTITUITO
  const [utenti, setUtenti] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [openNewUserDialog, setOpenNewUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null); 
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  useEffect(() => {
    setLoading(true);
    const db = getFirestore();
    const unsubUtentiMaster = onSnapshot(collection(db, 'utenti_master'), (snapshotMaster) => {
        const masterUsers = snapshotMaster.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<User, 'ruolo'>));
        
        const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshotAdmins) => {
            const adminIds = new Set(snapshotAdmins.docs.map(doc => doc.id));
            const combinedUsers = masterUsers.map(user => ({ ...user, ruolo: adminIds.has(user.id) ? 'admin' : 'user' } as User));

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
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setFeedback({ type: 'success', message: `Email di reset inviata con successo a ${email}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Impossibile inviare l'email di reset." });
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
    try {
      await gestisciUtenti({ action: 'toggleRole', uid: user.id, role: nuovoRuolo });
      setFeedback({ type: 'success', message: `Ruolo di ${user.nome} aggiornato con successo.` });
    } catch (err: any) { 
      setFeedback({ type: 'error', message: err.message || "Modifica ruolo fallita." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreaNuovoUtente = async (nome: string, email: string, password: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        await gestisciUtenti({ action: 'createUser', email, nome, password }); 
        setFeedback({ type: 'success', message: `Utente ${nome} creato. Verrà inviata un'email per il cambio password.` });
        setOpenNewUserDialog(false);
    } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Creazione utente fallita.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleUpdateUtente = async (id: string, nome: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        await gestisciUtenti({ action: 'updateUser', uid: id, nome });
        setFeedback({ type: 'success', message: `Utente ${nome} aggiornato con successo.` });
        setUserToEdit(null);
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
    { field: 'nome', headerName: 'Nome', flex: 1.5, minWidth: 200 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 220 },
    {
      field: 'ruolo',
      headerName: 'Ruolo',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Chip label={params.value === 'admin' ? 'Amministratore' : 'Utente'} color={params.value === 'admin' ? 'primary' : 'default'} size="small"/>
      )
    },
    {
      field: 'is_admin',
      headerName: 'Admin',
      flex: 0.8,
      minWidth: 100,
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
      flex: 1,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        const isCurrentUser = params.row.id === currentUser?.uid;
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
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

      {/* I dialoghi vengono ora renderizzati qui, ma sono definiti altrove */}
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
