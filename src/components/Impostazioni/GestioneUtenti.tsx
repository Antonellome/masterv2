
import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import {
    Box, Typography, Alert, CircularProgress, Switch, Tooltip
} from '@mui/material';
import {
    DataGrid, GridColDef,
    GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';

// Interfaccia per l'oggetto Utente dalla Cloud Function
interface AuthUser {
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

    const handleRoleChange = async (uid: string, currentRole: AuthUser['role']) => {
        const newRole = currentRole === 'admin' ? 'Nessuno' : 'admin';
        setActionLoading(prev => ({ ...prev, [uid]: true }));
        setFeedback(null);
        try {
            await manageUsers({ action: 'setRole', payload: { uid, newRole } });
            setFeedback({ type: 'success', message: `Ruolo per l'utente aggiornato a ${newRole}.` });
            setUsers(prevUsers => prevUsers.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        } catch (error: any) {
            console.error("Errore durante il cambio ruolo:", error);
            setFeedback({ type: 'error', message: `Errore: ${error.message || 'Errore sconosciuto.'}` });
        } finally {
            setActionLoading(prev => ({ ...prev, [uid]: false }));
        }
    };

    const columns: GridColDef<AuthUser>[] = [
        {
            field: 'role',
            headerName: 'Amministratore',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const isLoading = actionLoading[params.row.uid];
                return (
                    <Tooltip title={params.row.role === 'admin' ? 'Rimuovi ruolo Admin' : 'Imposta come Admin'}>
                        <Switch
                            checked={params.row.role === 'admin'}
                            onChange={() => handleRoleChange(params.row.uid, params.row.role)}
                            disabled={isLoading}
                        />
                    </Tooltip>
                );
            }
        },
        { field: 'email', headerName: 'Email Account', flex: 1.5 },
        { field: 'uid', headerName: 'User ID', flex: 1 },
    ];

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="h6" component="h2" gutterBottom>
                Gestione Ruoli Amministratori
            </Typography>
            <Typography variant="body2" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
                Da qui puoi promuovere un utente ad Amministratore o rimuovere i suoi privilegi. Gli amministratori hanno accesso completo al sistema.
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
