
import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import {
    Box, Typography, Alert, CircularProgress, Switch, Tooltip, IconButton, Button
} from '@mui/material';
import {
    DataGrid, GridColDef,
    GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import ScienceIcon from '@mui/icons-material/Science';
import UserActionsCell from './UserActionsCell';

// Interfaccia per l'oggetto Utente dalla Cloud Function
export interface AuthUser {
    uid: string;
    email: string;
    role: 'admin' | 'tecnico' | 'Nessuno';
    disabled: boolean;
}

// Inizializzazione delle Cloud Functions
const functions = getFunctions(undefined, 'europe-west1');
const manageUsers = httpsCallable(functions, 'manageUsers');

// Toolbar custom per la DataGrid
function CustomToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            <Box sx={{ flexGrow: 1 }} />
            <GridToolbarQuickFilter sx={{ minWidth: 240, mr: 1 }} placeholder="Cerca..." variant="outlined" size="small" />
        </GridToolbarContainer>
    );
}

const GestioneUtenti: React.FC = () => {
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [pingResult, setPingResult] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result: HttpsCallableResult<{ users: AuthUser[] }> = await manageUsers({ 
                action: 'list', 
                payload: { role: '!tecnico' } 
            });
            setUsers(result.data.users);
        } catch (err: any) {
            console.error("Errore caricamento utenti:", err);
            setError(err.message || "Impossibile caricare l'elenco degli utenti.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleApiCall = async (uid: string, action: 'setRole' | 'toggle' | 'deleteUser', payload: any, successMessage: string) => {
        setActionLoading(prev => ({ ...prev, [uid]: true }));
        setFeedback(null);
        try {
            await manageUsers({ action, payload });
            setFeedback({ type: 'success', message: successMessage });
            return true;
        } catch (error: any) {
            console.error(`Errore durante l'azione ${action}:`, error);
            setFeedback({ type: 'error', message: `Errore: ${error.message || 'Errore sconosciuto.'}` });
            return false;
        } finally {
            setActionLoading(prev => ({ ...prev, [uid]: false }));
        }
    };

    const handleRoleChange = async (uid: string, currentRole: AuthUser['role']) => {
        const newRole = currentRole === 'admin' ? 'Nessuno' : 'admin';
        const success = await handleApiCall(uid, 'setRole', { uid, newRole }, `Ruolo per l'utente aggiornato a ${newRole}.`);
        if (success) {
            setUsers(prevUsers => prevUsers.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        }
    };

    const handleToggleUserStatus = async (uid: string, currentStatus: boolean) => {
        const success = await handleApiCall(uid, 'toggle', { uid, disabled: !currentStatus }, `Stato utente aggiornato.`);
        if (success) {
            setUsers(prevUsers => prevUsers.map(u => u.uid === uid ? { ...u, disabled: !currentStatus } : u));
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (window.confirm("Sei sicuro di voler eliminare questo utente? L'azione è irreversibile.")) {
            const success = await handleApiCall(uid, 'deleteUser', { uid }, "Utente eliminato con successo.");
            if (success) {
                setUsers(prevUsers => prevUsers.filter(u => u.uid !== uid));
            }
        }
    };

    const handlePingTest = async () => {
        setPingResult("Invio ping...");
        try {
            const result: HttpsCallableResult<{ message: string }> = await manageUsers({ action: 'ping' });
            setPingResult(`Risposta dal backend: ${result.data.message}`);
        } catch (err: any) {
            console.error("Errore PING:", err);
            setPingResult(`Errore PING: ${err.message}`);
        }
    };

    const columns: GridColDef<AuthUser>[] = [
        {
            field: 'role',
            headerName: 'Amministratore',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Tooltip title={params.row.role === 'admin' ? 'Rimuovi ruolo Admin' : 'Imposta come Admin'}>
                    <Switch
                        checked={params.row.role === 'admin'}
                        onChange={() => handleRoleChange(params.row.uid, params.row.role)}
                        disabled={actionLoading[params.row.uid]}
                    />
                </Tooltip>
            )
        },
        { field: 'email', headerName: 'Email Account', flex: 1.5 },
        { field: 'uid', headerName: 'User ID', flex: 1 },
        {
            field: 'actions',
            headerName: 'Azioni',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params) => (
                <UserActionsCell 
                    user={params.row}
                    onToggleStatus={handleToggleUserStatus}
                    onDelete={handleDeleteUser}
                    isLoading={actionLoading[params.row.uid]}
                />
            )
        }
    ];

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="h6" component="h2" gutterBottom>
                Gestione Utenti e Ruoli
            </Typography>

            {/* --- PING TEST UI --- */}
            <Box sx={{ border: '1px solid #f0ad4e', p: 2, mb: 2, borderRadius: 1, backgroundColor: '#fcf8e3' }}>
                <Typography variant="h6" gutterBottom>Test di Connessione Backend</Typography>
                <Button
                    variant="contained"
                    color="warning"
                    startIcon={<ScienceIcon />}
                    onClick={handlePingTest}
                >
                    Ping Test
                </Button>
                {pingResult && <Typography sx={{ mt: 1, fontFamily: 'monospace' }}>{pingResult}</Typography>}
            </Box>
            
            <Typography variant="body2" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
                Da qui puoi promuovere un utente ad Amministratore, abilitarlo, disabilitarlo o eliminarlo. Gli amministratori hanno accesso completo al sistema.
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {feedback && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            
            <Box sx={{ mt: 2 }}>
                {loading ? (
                    <CircularProgress sx={{ mx: 'auto', mt: 4, display: 'block' }} />
                ) : (
                    <DataGrid
                        autoHeight
                        rows={users}
                        columns={columns}
                        getRowId={(row) => row.uid}
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10 } },
                            sorting: { sortModel: [{ field: 'email', sort: 'asc' }] }
                        }}
                        pageSizeOptions={[10, 25, 50]}
                        slots={{ toolbar: CustomToolbar }}
                        disableRowSelectionOnClick
                    />
                )}
            </Box>
        </Box>
    );
};

export default GestioneUtenti;
