
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
import UserActionsCell from './UserActionsCell';

// =======================================================================================
// !! CORREZIONE CRITICA BASATA SU analisi_pre_ricostruzione.md !!
// Questa interfaccia riflette la VERA struttura dati dei Custom Claims.
// La distinzione tra 'livello' e 'admin' è fondamentale.
// =======================================================================================
export interface StaffUser {
    uid: string;
    email: string;
    claims: {
        livello?: 'staff';
        admin?: boolean;
    };
    disabled: boolean;
}

// =======================================================================================
// !! CORREZIONE CRITICA !!
// Puntiamo alle funzioni backend CORRETTE e definite nel piano di refactoring.
// =======================================================================================
const functions = getFunctions(undefined, 'europe-west1');
// Funzione per leggere SOLO il personale con livello='staff'
const getUsersFunction = httpsCallable(functions, 'admin_getAllUsers');
// Funzione per MODIFICARE gli utenti staff
const manageUserFunction = httpsCallable(functions, 'amministrazione_gestisciUtenti');

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
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Carica solo gli utenti con `livello: 'staff'` come specificato nel piano
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result: HttpsCallableResult<{ users: StaffUser[] }> = await getUsersFunction();
            setUsers(result.data.users);
        } catch (err: any) {
            console.error("Errore caricamento utenti:", err);
            setError(err.message || "Impossibile caricare l'elenco dello staff.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Funzione centralizzata per chiamare il backend, allineata a `amministrazione_gestisciUtenti`
    const handleApiCall = async (uid: string, action: 'toggleRole' | 'deleteUser', payload: any, successMessage: string) => {
        setActionLoading(prev => ({ ...prev, [uid]: true }));
        setFeedback(null);
        try {
            await manageUserFunction({ action, ...payload });
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

    // Logica per cambiare il ruolo, conforme alle specifiche
    const handleRoleChange = async (uid: string, claims: StaffUser['claims']) => {
        const currentIsAdmin = claims?.admin === true;
        const newRole = currentIsAdmin ? 'user' : 'admin'; // L'API si aspetta 'admin' o 'user'

        const success = await handleApiCall(uid, 'toggleRole', { uid, role: newRole }, `Ruolo per l'utente aggiornato.`);
        if (success) {
            setUsers(prevUsers => prevUsers.map(u => 
                u.uid === uid ? { ...u, claims: { ...u.claims, admin: !currentIsAdmin } } : u
            ));
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
    
    // Funzione non implementata come da analisi
    const handleToggleUserStatus = async (uid: string, currentStatus: boolean) => {
        console.warn("La funzione per abilitare/disabilitare non è implementata nel backend target.");
        setFeedback({type: 'error', message: 'Funzionalità di abilitazione/disabilitazione non ancora disponibile.'})
    };

    const columns: GridColDef<StaffUser>[] = [
        {
            field: 'admin',
            headerName: 'Amministratore',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Tooltip title={params.row.claims?.admin ? 'Rimuovi privilegi di Amministratore' : 'Promuovi ad Amministratore'}>
                    <Switch
                        checked={params.row.claims?.admin === true}
                        onChange={() => handleRoleChange(params.row.uid, params.row.claims)}
                        disabled={actionLoading[params.row.uid]}
                        color="warning"
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
                    onToggleStatus={() => handleToggleUserStatus(params.row.uid, params.row.disabled)}
                    onDelete={() => handleDeleteUser(params.row.uid)}
                    isLoading={actionLoading[params.row.uid]}
                />
            )
        }
    ];

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="h6" component="h2" gutterBottom>
                Gestione Personale Amministrativo
            </Typography>
            
            <Typography variant="body2" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
                Questa tabella mostra solo gli utenti con il livello 'staff'. Da qui puoi promuoverli ad Amministratore, garantendo accesso completo al sistema.
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
