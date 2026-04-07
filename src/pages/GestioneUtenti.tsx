
import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { 
    Box, Typography, Alert, CircularProgress, Switch, Tooltip, IconButton, Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
    DataGrid, GridColDef,
    GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import DeleteIcon from '@mui/icons-material/Delete';

// Interfaccia corretta per l'utente
interface AuthUser {
    uid: string;
    email: string;
    ruolo: 'admin' | 'tecnico' | 'Nessuno'; // Corrisponde a quello che arriva dal backend
    disabled: boolean;
    nome?: string;
    cognome?: string;
}

// Inizializzazione delle Cloud Functions, una sola volta.
const functions = getFunctions(undefined, 'europe-west1');
const manageUsersCallable = httpsCallable(functions, 'manageUsers');

// Toolbar custom per la DataGrid
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

const GestioneUtentiPage: React.FC = () => {
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [openNewUserDialog, setOpenNewUserDialog] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    
    // Stato di caricamento per singola riga
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    // Funzione centralizzata per chiamare il backend
    const callApi = useCallback(async (action: string, payload: any) => {
        try {
            const result: HttpsCallableResult<any> = await manageUsersCallable({ action, payload });
            return result.data;
        } catch (err: any) {
            console.error(`Errore durante l'azione '${action}':`, err);
            throw new Error(err.message || `Impossibile completare l'operazione: ${action}.`);
        }
    }, []);

    // Funzione per caricare gli utenti
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await callApi('list', {});
            const filteredUsers = result.users.filter((user: AuthUser) => user.ruolo !== 'tecnico');
            setUsers(filteredUsers);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [callApi]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (uid: string, currentRole: AuthUser['ruolo']) => {
        const newRole = currentRole === 'admin' ? 'Nessuno' : 'admin';
        
        setActionLoading(prev => ({ ...prev, [uid]: true }));
        setFeedback(null);

        try {
            await callApi('setRole', { uid, role: newRole });
            setFeedback({ type: 'success', message: `Ruolo aggiornato a ${newRole}.` });
            
            setUsers(prevUsers => prevUsers.map(u => 
                u.uid === uid ? { ...u, ruolo: newRole } : u
            ));

        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        } finally {
            setActionLoading(prev => ({ ...prev, [uid]: false }));
        }
    };
    
    const handleDeleteUser = async (uid: string) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo utente? L'azione è irreversibile.")) {
            return;
        }

        setActionLoading(prev => ({ ...prev, [uid]: true }));
        setFeedback(null);

        try {
            await callApi('deleteUser', { uid });
            setFeedback({ type: 'success', message: "Utente eliminato con successo." });
            setUsers(prevUsers => prevUsers.filter(u => u.uid !== uid));

        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        } finally {
            setActionLoading(prev => ({ ...prev, [uid]: false }));
        }
    };

    const handleCreateNewUser = async () => {
        if (!newUserEmail) {
            setFeedback({ type: 'error', message: "L'email non può essere vuota." });
            return;
        }
        
        setIsCreatingUser(true);
        setFeedback(null);

        try {
            await callApi('createUser', { email: newUserEmail, role: 'admin' });
            setFeedback({ type: 'success', message: `Utente ${newUserEmail} creato e promosso ad amministratore. Riceverà una mail per impostare la password.` });
            
            // Re-fetch users per visualizzare il nuovo utente
            fetchUsers();
            handleCloseNewUserDialog();

        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleOpenNewUserDialog = () => setOpenNewUserDialog(true);
    const handleCloseNewUserDialog = () => {
        setOpenNewUserDialog(false);
        setNewUserEmail(''); // Pulisci l'input alla chiusura
    };

    const columns: GridColDef<AuthUser>[] = [
        { field: 'email', headerName: 'Email Utente', flex: 1 },
        {
            field: 'ruolo',
            headerName: 'Admin',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Tooltip title={params.row.ruolo === 'admin' ? 'Rimuovi privilegi Admin' : 'Concedi privilegi Admin'}>
                    <Switch
                        checked={params.row.ruolo === 'admin'}
                        onChange={() => handleRoleChange(params.row.uid, params.row.ruolo)}
                        disabled={actionLoading[params.row.uid]}
                        color="primary"
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
                <Tooltip title="Elimina utente">
                    <span>
                        <IconButton
                            onClick={() => handleDeleteUser(params.row.uid)}
                            disabled={actionLoading[params.row.uid]}
                            color="error"
                        >
                            <DeleteIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            )
        }
    ];

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Gestione Amministratori
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
                Crea nuovi utenti amministratori, modifica i loro privilegi o rimuovili dal sistema.
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {feedback && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            
            <Box sx={{ height: '70vh', width: '100%' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <DataGrid
                        rows={users}
                        columns={columns}
                        getRowId={(row) => row.uid}
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10 } },
                            sorting: { sortModel: [{ field: 'email', sort: 'asc' }] }
                        }}
                        pageSizeOptions={[10, 25, 50, 100]}
                        slots={{ toolbar: CustomToolbar }}
                        slotProps={{ toolbar: { onAddNew: handleOpenNewUserDialog } }}
                        disableRowSelectionOnClick
                        autoHeight
                    />
                )}
            </Box>

            {/* Dialog per creare un nuovo utente */}
            <Dialog open={openNewUserDialog} onClose={handleCloseNewUserDialog}>
                <DialogTitle>Nuovo Amministratore</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Inserisci l'indirizzo email del nuovo utente che verrà creato e promosso ad amministratore.
                        L'utente riceverà una mail per completare la registrazione e impostare la password.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="email"
                        label="Indirizzo Email"
                        type="email"
                        fullWidth
                        variant="standard"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        disabled={isCreatingUser}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNewUserDialog} disabled={isCreatingUser}>Annulla</Button>
                    <Button onClick={handleCreateNewUser} disabled={isCreatingUser}>
                        {isCreatingUser ? <CircularProgress size={24} /> : 'Crea e Promuovi'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestioneUtentiPage;
