import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { Box, Typography, Alert, CircularProgress, Snackbar, Select, MenuItem, Button } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';

interface User {
    uid: string;
    email: string;
    role: 'admin' | 'tecnico' | 'Nessuno';
    disabled: boolean;
}

interface ListUsersResult {
    users: User[];
}

const functions = getFunctions(undefined, 'europe-west1');
const manageUsers = httpsCallable(functions, 'manageUsers');

const GestioneUtenti = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string }>({ open: false, message: '' });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result: HttpsCallableResult<ListUsersResult> = await manageUsers({ 
                action: 'list', 
                payload: { role: '!tecnico' } 
            });
            setUsers(result.data.users);
        } catch (err: unknown) {
            console.error("Errore dettagliato caricamento utenti:", err);
            const firebaseError = err as { message?: string };
            const errorMessage = firebaseError.message || "Impossibile caricare l'elenco degli utenti.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (uid: string, newRole: string) => {
        try {
            await manageUsers({ action: 'setRole', payload: { uid, newRole } });
            setSnackbar({ open: true, message: 'Ruolo amministratore aggiornato.' });
            fetchUsers();
        } catch (err: unknown) {
            const firebaseError = err as { message?: string };
            const errorMessage = firebaseError.message || "Errore durante l'aggiornamento del ruolo.";
            setSnackbar({ open: true, message: `Errore: ${errorMessage}` });
        }
    };

    const columns: GridColDef<User>[] = [
        { field: 'email', headerName: 'Email Utente', flex: 1, minWidth: 250 },
        { field: 'uid', headerName: 'User ID', flex: 1, minWidth: 250 },
        { 
            field: 'role', 
            headerName: 'Ruolo Amministratore',
            width: 180, 
            renderCell: (params) => (
                <Select 
                    value={params.row.role === 'admin' ? 'admin' : 'Nessuno'}
                    onChange={(e) => handleRoleChange(params.row.uid, e.target.value)}
                    size="small" 
                    sx={{ width: '100%' }}
                >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="Nessuno">Nessuno</MenuItem>
                </Select>
            )
        },
    ];

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1">Gestione Amministratori</Typography>
                <Button variant="outlined" onClick={fetchUsers} disabled={loading}>Aggiorna</Button>
            </Box>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ height: 'auto', width: '100%' }}>
                <DataGrid 
                    rows={users}
                    columns={columns} 
                    getRowId={(row) => row.uid} 
                    autoHeight 
                    localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
                    initialState={{ sorting: { sortModel: [{ field: 'email', sort: 'asc' }] } }} 
                    slots={{ toolbar: GridToolbar }} 
                    disableRowSelectionOnClick 
                    sx={{ border: 0 }} 
                />
            </Box>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })} 
                message={snackbar.message} 
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default GestioneUtenti;
