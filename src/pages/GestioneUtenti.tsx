import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { Box, Typography, Alert, CircularProgress, Snackbar, Select, MenuItem, Button, SelectChangeEvent } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridRowParams } from '@mui/x-data-grid';
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
    const [promoting, setPromoting] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result: HttpsCallableResult<ListUsersResult> = await manageUsers({ action: 'listAll' });
            setUsers(result.data.users);
        } catch (err: unknown) {
            console.error("Errore dettagliato caricamento utenti:", err);
            // Correzione: Estrae il messaggio di errore reale dalla risposta della funzione.
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
            setSnackbar({ open: true, message: 'Ruolo aggiornato con successo!' });
            fetchUsers();
        } catch (err: unknown) {
            const firebaseError = err as { message?: string };
            const errorMessage = firebaseError.message || "Errore durante l'aggiornamento del ruolo.";
            setSnackbar({ open: true, message: `Errore: ${errorMessage}` });
        }
    };

    const handlePromoteToAdmin = async () => {
        setPromoting(true);
        try {
            const result: HttpsCallableResult<{ message: string }> = await manageUsers({ action: 'promoteToAdmin' });
            setSnackbar({ open: true, message: result.data.message });
            // Ricarica la pagina per aggiornare il token di autenticazione dell'utente.
            window.location.reload();
        } catch (err: unknown) {
            const firebaseError = err as { message?: string };
            const errorMessage = firebaseError.message || "Impossibile completare l'operazione.";
            setSnackbar({ open: true, message: `Errore: ${errorMessage}` });
        } finally {
            setPromoting(false);
        }
    };

    const columns: GridColDef<User>[] = [
        { field: 'email', headerName: 'Email Utente', flex: 1, minWidth: 250 },
        { field: 'uid', headerName: 'User ID', flex: 1, minWidth: 250 },
        { field: 'role', headerName: 'Ruolo', width: 150, renderCell: (params) => (
            <Select value={params.row.role || 'Nessuno'} onChange={(e) => handleRoleChange(params.row.uid, e.target.value)} size="small" sx={{ width: '100%' }}>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="tecnico">Tecnico</MenuItem>
                <MenuItem value="Nessuno">Nessuno</MenuItem>
            </Select>
        )},
        { field: 'disabled', headerName: 'Stato', width: 100, align: 'center', renderCell: (params) => (
            <Typography color={params.row.disabled ? 'error' : 'success'}>{params.row.disabled ? 'Disabilitato' : 'Attivo'}</Typography>
        )},
    ];

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1">Gestione Utenti e Ruoli</Typography>
                <Button variant="outlined" onClick={fetchUsers} disabled={loading}>Aggiorna Lista</Button>
            </Box>
            
            {/* Condizione Robusta: Se c'è un errore E la lista utenti è vuota, mostra l'opzione di promozione */}
            {error && users.length === 0 && (
                 <Box sx={{mb: 3}}>
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    <Alert severity="info" action={
                        <Button color="primary" variant="contained" onClick={handlePromoteToAdmin} disabled={promoting} startIcon={promoting ? <CircularProgress size={20} color="inherit"/> : null}>
                            {promoting ? 'Promozione...' : 'Diventa Amministratore'}
                        </Button>
                    }>
                        <Typography variant="body1" gutterBottom><strong>Azione Richiesta</strong></Typography>
                        <Typography variant="body2">Sembra che tu non abbia i permessi per vedere questa lista. Se questo è il primo avvio, puoi auto-promuoverti a primo amministratore del sistema.</Typography>
                    </Alert>
                </Box>
            )}

            <Box sx={{ height: 'auto', width: '100%' }}>
                <DataGrid rows={users} columns={columns} getRowId={(row) => row.uid} autoHeight localeText={itIT.components.MuiDataGrid.defaultProps.localeText} initialState={{ sorting: { sortModel: [{ field: 'email', sort: 'asc' }] } }} slots={{ toolbar: GridToolbar }} disableRowSelectionOnClick sx={{ border: 0 }} />
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
        </Box>
    );
};

export default GestioneUtenti;
