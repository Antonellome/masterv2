
import React, { useState, useEffect, useCallback } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import { functions } from '@/config/firebase'; // RIPRISTINO: Torniamo all'importazione originale
import { httpsCallable } from 'firebase/functions';
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
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

// RIPRISTINO: Logica originale che usa l'istanza importata
const gestisciUtenti = httpsCallable(functions, 'amministrazione_gestisciUtenti');
const getAllUsers = httpsCallable(functions, 'admin_getAllUsers');

interface User {
  id: string; // Firebase UID
  nome: string | null;
  email: string | null;
  ruolo: 'admin' | 'user';
}

const GestioneAmministratori = () => {
  const currentUser = useGlobalStore(state => state.user);
  const [utenti, setUtenti] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [openNewUserDialog, setOpenNewUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllUsers();
      const usersData = Array.isArray(result.data)
        ? (result.data as any[]).filter(user => user && user.id)
        : [];
      setUtenti(usersData as User[]);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Impossibile caricare gli utenti." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (action: () => Promise<any>, successMessage: string, errorMessage: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await action();
      setFeedback({ type: 'success', message: successMessage });
      fetchUsers(); 
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = (email: string) => {
    handleAction(
        () => sendPasswordResetEmail(getAuth(), email),
        `Email di reset inviata a ${email}.`,
        "Impossibile inviare l'email di reset."
    );
  };

  const handleToggleRuolo = (user: User, nuovoRuolo: 'admin' | 'user') => {
    if (user.id === currentUser?.uid) {
      setFeedback({ type: 'error', message: 'Non puoi modificare il tuo stesso ruolo.' });
      return;
    }
    handleAction(
        () => gestisciUtenti({ action: 'toggleRole', uid: user.id, role: nuovoRuolo }),
        `Ruolo di ${user.nome} aggiornato.`,
        "Modifica ruolo fallita."
    );
  };

  const handleCreaNuovoUtente = (nome: string, email: string, password: string) => {
    handleAction(
        () => gestisciUtenti({ action: 'createUser', email, nome, password }),
        `Utente ${nome} creato.`,
        'Creazione utente fallita.'
    ).finally(() => setOpenNewUserDialog(false));
  };

  const handleUpdateUtente = (id: string, nome: string) => {
    handleAction(
        () => gestisciUtenti({ action: 'updateUser', uid: id, nome }),
        `Utente ${nome} aggiornato.`,
        'Aggiornamento fallito.'
    ).finally(() => setUserToEdit(null));
  };

  const handleEliminaUtente = () => {
    if (!userToDelete) return;
    handleAction(
        () => gestisciUtenti({ action: 'deleteUser', uid: userToDelete.id }),
        `Utente ${userToDelete.nome} eliminato.`,
        'Eliminazione fallita.'
    ).finally(() => setUserToDelete(null));
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
                <IconButton color="primary" onClick={() => handleSendPasswordReset(params.row.email as string)} disabled={isSaving}>
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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Gestione Utenti</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Aggiungi nuovi utenti e gestisci i privilegi di amministrazione.</Typography>

      <Box sx={{ height: 650, width: '100%', overflowX: 'auto' }} className="no-scrollbar">
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
