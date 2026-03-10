
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthProvider';
import {
    Box, Typography, Alert, CircularProgress, Snackbar, TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Switch
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import DeleteIcon from '@mui/icons-material/Delete';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

interface MasterAppUser {
    id: string;
    email: string;
    disabled: boolean;
}

const functions = getFunctions();
const setUserStatusFunction = httpsCallable(functions, 'setUserDisabledStatus');
const createNewMasterUserFunction = httpsCallable(functions, 'createNewMasterUser');
const deleteUserFunction = httpsCallable(functions, 'deleteUser');

const GestioneUtentiTab = () => {
    const { user, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<MasterAppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const [openDialog, setOpenDialog] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const querySnapshot = await getDocs(collection(db, "utenti_master"));
            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email || 'N/D',
                disabled: doc.data().disabled || false,
            } as MasterAppUser));
            setUsers(usersData);
        } catch (err) {
            console.error("Errore nel caricamento degli utenti:", err);
            setError("Impossibile caricare l'elenco degli utenti.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchUsers();
        }
    }, [user, fetchUsers]);

    const handleCreateUser = async () => {
        if (!newUserEmail) {
            setSnackbar({ open: true, message: 'L\'email non può essere vuota.', severity: 'error' });
            return;
        }
        if (users.some(u => u.email.toLowerCase() === newUserEmail.toLowerCase())) {
            setSnackbar({ open: true, message: 'Questo utente è già abilitato.', severity: 'error' });
            return;
        }
        try {
            await createNewMasterUserFunction({ email: newUserEmail });
            setSnackbar({ open: true, message: 'Nuovo utente creato con successo!', severity: 'success' });
            setNewUserEmail('');
            setOpenDialog(false);
            fetchUsers();
        } catch (err: unknown) {
            console.error("Errore nella creazione dell'utente:", err);
            const message = err instanceof Error ? err.message : 'Errore durante la creazione dell\'utente.';
            setSnackbar({ open: true, message, severity: 'error' });
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (id === user?.uid) {
            setSnackbar({ open: true, message: 'Non puoi eliminare il tuo stesso account.', severity: 'error' });
            return;
        }
        if (!window.confirm('Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questo utente? L\'azione è irreversibile.')) return;
        try {
            await deleteUserFunction({ uid: id });
            setSnackbar({ open: true, message: 'Utente eliminato con successo.', severity: 'success' });
            fetchUsers();
        } catch (err: unknown) {
            console.error("Errore nella rimozione dell'utente:", err);
            const message = err instanceof Error ? err.message : 'Errore durante l\'eliminazione dell\'utente.';
            setSnackbar({ open: true, message, severity: 'error' });
        }
    };
    
    const handleToggleDisabled = async (id: string, currentStatus: boolean) => {
        if (id === user?.uid) {
            setSnackbar({ open: true, message: 'Non puoi disabilitare il tuo stesso account.', severity: 'error' });
            return;
        }
        const newStatus = !currentStatus;
        const actionText = newStatus ? 'disabilitare' : 'abilitare';
        if (!window.confirm(`Sei sicuro di voler ${actionText} questo utente?`)) return;

        try {
            await setUserStatusFunction({ uid: id, disabled: newStatus });
            setSnackbar({ open: true, message: `Utente ${newStatus ? 'disabilitato' : 'abilitato'} con successo.`, severity: 'success' });
            fetchUsers();
        } catch (error: unknown) {
            console.error(`Errore nel ${actionText} l'utente:`, error);
            const message = error instanceof Error ? error.message : 'Operazione fallita.';
            setSnackbar({ open: true, message, severity: 'error' });
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!window.confirm(`Inviare un'email di ripristino password a ${email}?`)) return;
        try {
            await sendPasswordResetEmail(getAuth(), email);
            setSnackbar({ open: true, message: `Email di ripristino inviata a ${email}.`, severity: 'success' });
        } catch (error: unknown) {
            console.error("Errore nell'invio dell'email di reset:", error);
            const message = error instanceof Error ? error.message : 'Invio fallito.';
            setSnackbar({ open: true, message, severity: 'error' });
        }
    };

    const columns: GridColDef<MasterAppUser>[] = [
        { field: 'email', headerName: 'Email Utente', flex: 1 },
        {
            field: 'disabled',
            headerName: 'Stato',
            width: 120, align: 'center', headerAlign: 'center',
            renderCell: (params) => (
                <Typography color={!params.value ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold' }}>
                    {!params.value ? 'Attivo' : 'Disabilitato'}
                </Typography>
            ),
        },
        {
            field: 'actions',
            headerName: 'Azioni',
            sortable: false, disableColumnMenu: true,
            width: 180, align: 'center', headerAlign: 'center',
            renderCell: (params) => {
                const isSelf = params.id === user?.uid;
                return (
                    <Box>
                        <Tooltip title={isSelf ? "Non puoi modificare il tuo stato" : (params.row.disabled ? 'Abilita Utente' : 'Disabilita Utente')}>
                            <span>
                                <Switch checked={!params.row.disabled} onChange={() => handleToggleDisabled(params.id as string, params.row.disabled)} color="success" disabled={isSelf} />
                            </span>
                        </Tooltip>
                        <Tooltip title="Invia Email di Reset Password">
                            <IconButton onClick={() => handleResetPassword(params.row.email)} color="primary"><VpnKeyIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title={isSelf ? "Non puoi eliminare te stesso" : "Elimina Utente (Irreversibile)"}>
                             <span>
                                <IconButton onClick={() => handleDeleteUser(params.id as string)} color="error" disabled={isSelf}><DeleteIcon /></IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                );
            },
        },
    ];

    if (authLoading || loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }
    
    if (!user) {
        return (<Alert severity="error">Devi essere autenticato per accedere a questa sezione.</Alert>);
    }

    const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                 <Typography variant="h6">Gestione Utenti e Accessi</Typography>
                <Button variant="contained" onClick={() => setOpenDialog(true)}>Aggiungi Utente</Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Gestisci gli utenti che possono accedere all'applicazione, il loro stato e le loro credenziali.</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid rows={users} columns={columns} autoHeight localeText={itIT.components.MuiDataGrid.defaultProps.localeText} initialState={{ sorting: { sortModel: [{ field: 'email', sort: 'asc' }] } }} slots={{ toolbar: GridToolbar }} disableRowSelectionOnClick sx={{ border: 0 }} />
            </Box>
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
                <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" id="email" label="Indirizzo Email dell'Utente" type="email" fullWidth variant="standard" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Annulla</Button>
                    <Button onClick={handleCreateUser}>Crea e Abilita</Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default GestioneUtentiTab;
