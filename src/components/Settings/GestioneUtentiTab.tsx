
import { useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useAuth } from '@/contexts/AuthProvider';
import { useDataContext } from '@/contexts/DataContext';
import {
    Box, Alert, CircularProgress, IconButton, Tooltip, Switch
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { WebAppUser } from '@/models/definitions';

const manageUsers = httpsCallable(functions, 'manageUsers');

const GestioneUtentiTab = () => {
    const { user } = useAuth();
    const { webAppUsers, loading, error } = useDataContext();

    const filteredUsers = useMemo(() => {
        return webAppUsers.filter(u => u.ruolo !== 'tecnico');
    }, [webAppUsers]);

    const handleRoleChange = async (uid: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'utente' : 'admin';
        if (currentRole === 'admin' && filteredUsers.filter(u => u.ruolo === 'admin').length <= 1) {
            alert('Impossibile rimuovere l\'ultimo amministratore.');
            return;
        }
        if (!window.confirm(`Sei sicuro di voler cambiare il ruolo a questo utente in "${newRole}"?`)) return;
        
        try {
            await manageUsers({ action: 'setRole', payload: { uid, role: newRole } });
        } catch (err: any) {
            alert(`Errore: ${err.message}`);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        const userToDelete = filteredUsers.find(u => u.uid === uid);
        if (userToDelete?.ruolo === 'admin' && filteredUsers.filter(u => u.ruolo === 'admin').length <= 1) {
            alert('Impossibile eliminare l\'ultimo amministratore.');
            return;
        }
        if (!window.confirm('Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questo utente? L\'azione è irreversibile.')) return;

        try {
            await manageUsers({ action: 'deleteUser', payload: { uid } });
        } catch (err: any) {
             alert(`Errore: ${err.message}`);
        }
    };

    const columns: GridColDef<WebAppUser>[] = [
        { field: 'email', headerName: 'Email Utente', flex: 1 },
        {
            field: 'ruolo',
            headerName: 'Admin',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRowParams<WebAppUser>) => (
                <Tooltip title={params.row.ruolo === 'admin' ? 'Rimuovi privilegi Admin' : 'Concedi privilegi Admin'}>
                    <Switch
                        checked={params.row.ruolo === 'admin'}
                        onChange={() => handleRoleChange(params.row.uid, params.row.ruolo)}
                        disabled={params.id === user?.uid}
                        icon={<AdminPanelSettingsIcon color="disabled" />}
                        checkedIcon={<AdminPanelSettingsIcon color="success" />}
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
            renderCell: (params: GridRowParams<WebAppUser>) => (
                <Tooltip title="Elimina Utente (Irreversibile)">
                    <span>
                        <IconButton
                            onClick={() => handleDeleteUser(params.row.uid)}
                            color="error"
                            disabled={params.id === user?.uid}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            )
        },
    ];

    if (loading && filteredUsers.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

    return (
        <Box sx={{ width: '100%' }}>
            <DataGrid 
                autoHeight
                rows={filteredUsers} 
                columns={columns}
                loading={loading}
                localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} 
                pageSizeOptions={[10, 25, 50, 100]}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
                disableRowSelectionOnClick
            />
        </Box>
    );
};

export default GestioneUtentiTab;
