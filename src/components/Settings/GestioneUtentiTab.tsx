
import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useAuth } from '@/contexts/AuthProvider';
import { useDataContext } from '@/contexts/DataContext';
import { 
    Box, 
    Alert, 
    IconButton, 
    Tooltip, 
    Switch, 
    Button
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddIcon from '@mui/icons-material/Add';
import { AdminMaster } from '@/models/user.models';
import ConfirmationDialog from '../ConfirmationDialog';
import AddUserDialog from './AddUserDialog';

const manageUsersCallable = httpsCallable(functions, 'manageUsers');

const GestioneUtentiTab = () => {
    const { user: currentUser, refreshData } = useAuth(); // Assuming refreshData can be triggered from Auth
    const { webAppUsers, loading: contextLoading, error: contextError } = useDataContext();

    const [users, setUsers] = useState<AdminMaster[]>([]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [confirmationDialogConfig, setConfirmationDialogConfig] = useState<{ title: string; content: string; onConfirm: () => void; } | null>(null);

    const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);

    useEffect(() => {
        const filtered = (webAppUsers || []).filter(u => u.ruolo !== 'tecnico') as AdminMaster[];
        setUsers(filtered);
    }, [webAppUsers]);

    const handleUserAdded = () => {
        // This function will be called from the dialog on success.
        // It could trigger a re-fetch of the users list.
        // In our case, the real-time listener of useDataContext should do this automatically.
        setFeedback({ type: 'success', message: 'Lista utenti aggiornata.' });
        // The dialog closes itself.
    };

    const handleRoleChange = (uid: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'utente' : 'admin';
        const userToChange = users.find(u => u.id === uid);

        if (currentRole === 'admin' && users.filter(u => u.ruolo === 'admin').length <= 1) {
            setFeedback({ type: 'error', message: 'Impossibile rimuovere l\'ultimo amministratore.' });
            return;
        }

        setConfirmationDialogConfig({
            title: 'Conferma Cambio Ruolo',
            content: `Sei sicuro di voler cambiare il ruolo di ${userToChange?.email} in "${newRole}"?`,
            onConfirm: async () => {
                const originalUsers = users;
                const optimisticUsers = users.map(u => 
                    u.id === uid ? { ...u, ruolo: newRole } : u
                );
                setUsers(optimisticUsers);
                setFeedback(null);
                setConfirmationDialogOpen(false);

                try {
                    await manageUsersCallable({ action: 'setRole', payload: { uid, role: newRole } });
                    setFeedback({ type: 'success', message: `Ruolo di ${userToChange?.email} aggiornato.` });
                } catch (err: any) {
                    console.error("Role change failed:", err);
                    setFeedback({ type: 'error', message: `Errore aggiornamento: ${err.message}. Ripristino.` });
                    setUsers(originalUsers);
                }
            }
        });
        setConfirmationDialogOpen(true);
    };

    const handleDeleteUser = (uid: string) => {
        const userToDelete = users.find(u => u.id === uid);
        if (!userToDelete) return;

        if (userToDelete.ruolo === 'admin' && users.filter(u => u.ruolo === 'admin').length <= 1) {
            setFeedback({ type: 'error', message: 'Impossibile eliminare l\'ultimo amministratore.' });
            return;
        }

        setConfirmationDialogConfig({
            title: 'Conferma Eliminazione Utente',
            content: `Sei sicuro di voler ELIMINARE DEFINITIVAMENTE l'utente ${userToDelete.email}? L'azione è irreversibile.`,
            onConfirm: async () => {
                const originalUsers = users;
                const optimisticUsers = users.filter(u => u.id !== uid);
                setUsers(optimisticUsers);
                setFeedback(null);
                setConfirmationDialogOpen(false);

                try {
                    await manageUsersCallable({ action: 'deleteUser', payload: { uid } });
                    setFeedback({ type: 'success', message: `Utente ${userToDelete.email} eliminato.` });
                } catch (err: any) {
                    console.error("Delete user failed:", err);
                    setFeedback({ type: 'error', message: `Errore eliminazione: ${err.message}. Ripristino.` });
                    setUsers(originalUsers);
                }
            }
        });
        setConfirmationDialogOpen(true);
    };
    
    const columns: GridColDef<AdminMaster>[] = [
        { field: 'email', headerName: 'Email Utente', flex: 1 },
        { field: 'nome', headerName: 'Nome', flex: 1 },
        {
            field: 'ruolo',
            headerName: 'Admin',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRowParams<AdminMaster>) => {
                return (
                    <Tooltip title={params.row.ruolo === 'admin' ? 'Rimuovi privilegi Admin' : 'Concedi privilegi Admin'}>
                        <span>
                            <Switch
                                checked={params.row.ruolo === 'admin'}
                                onChange={() => handleRoleChange(params.row.id, params.row.ruolo)}
                                disabled={params.id === currentUser?.uid}
                                icon={<AdminPanelSettingsIcon color="disabled" />}
                                checkedIcon={<AdminPanelSettingsIcon color="success" />}
                            />
                        </span>
                    </Tooltip>
                );
            }
        },
        {
            field: 'actions',
            headerName: 'Azioni',
            width: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRowParams<AdminMaster>) => {
                return (
                    <Tooltip title="Elimina Utente (Irreversibile)">
                         <span>
                            <IconButton
                                onClick={() => handleDeleteUser(params.row.id)}
                                color="error"
                                disabled={params.id === currentUser?.uid}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                );
            }
        },
    ];

    const isLoading = contextLoading && !users.length;

    return (
        <Box sx={{ width: '100%' }}>
             <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddUserDialogOpen(true)}
                >
                    Aggiungi Utente
                </Button>
            </Box>

            {feedback && <Alert severity={feedback.type} sx={{ mb: 2, mt: 1 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            {contextError && !feedback && <Alert severity="error" sx={{ m: 2 }}>{contextError}</Alert>}
            
            <DataGrid 
                autoHeight
                rows={users}
                columns={columns}
                getRowId={(row) => row.id}
                loading={isLoading}
                localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} 
                pageSizeOptions={[10, 25, 50, 100]}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
                disableRowSelectionOnClick
            />

            {confirmationDialogConfig && (
                <ConfirmationDialog
                    open={confirmationDialogOpen}
                    title={confirmationDialogConfig.title}
                    content={confirmationDialogConfig.content}
                    onConfirm={() => {
                        confirmationDialogConfig.onConfirm();
                    }}
                    onCancel={() => setConfirmationDialogOpen(false)}
                />
            )}

            <AddUserDialog
                open={addUserDialogOpen}
                onClose={() => setAddUserDialogOpen(false)}
                onUserAdded={handleUserAdded}
            />

        </Box>
    );
};

export default GestioneUtentiTab;
