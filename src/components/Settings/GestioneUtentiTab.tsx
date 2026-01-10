import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
    Box, Typography, Alert, CircularProgress, Tooltip, Select, MenuItem, FormControl, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, SelectChangeEvent
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { VpnKey, Add, Delete, ToggleOn, ToggleOff } from '@mui/icons-material';
import type { UserRole } from '@/contexts/AuthContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface Utente {
    id: string;
    nome: string;
    email: string;
    disabled: boolean;
    ruolo: UserRole;
}

const GestioneUtentiTab: React.FC = () => {
    const { isAdmin, user } = useAuth();
    const hasTemporaryAdminAccess = isAdmin || user?.uid === 'sm6w10dUiHcEs5p1zdFmWlreKAd2';

    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newUser, setNewUser] = useState({ nome: '', email: '', ruolo: 'user' as UserRole });

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogProps, setConfirmDialogProps] = useState({ title: '', description: '', onConfirm: () => {} });

    const fetchUtenti = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "utenti_master"));
            const utentiData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                ruolo: doc.data().ruolo || 'user',
            } as Utente));
            setUtenti(utentiData);
            setError(null);
        } catch (err) {
            console.error("Errore fetchUtenti:", err);
            setError("Impossibile caricare l'elenco degli utenti.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (hasTemporaryAdminAccess) {
            fetchUtenti();
        } else {
            setLoading(false);
            setError("Non hai i permessi per visualizzare questa sezione.");
        }
    }, [fetchUtenti, hasTemporaryAdminAccess]);

    const openConfirmationDialog = (title: string, description: string, onConfirm: () => void) => {
        setConfirmDialogProps({ title, description, onConfirm });
        setConfirmDialogOpen(true);
    };

    const handleResetPassword = async (email: string) => {
        openConfirmationDialog(
            'Conferma Reset Password',
            `Sei sicuro di voler inviare un'email di reset password a ${email}?`,
            async () => {
                const auth = getAuth();
                try {
                    await sendPasswordResetEmail(auth, email);
                    setFeedback({ type: 'success', message: `Email di reset inviata con successo a ${email}.` });
                } catch (error: unknown) {
                    console.error("--- ERRORE DETTAGLIATO FIREBASE ---", error);
                    let errorMessage = "Si è verificato un errore sconosciuto.";
                    if (error instanceof Error && 'code' in error) {
                        const firebaseError = error as { code: string; message: string };
                        errorMessage = `Errore: ${firebaseError.code} - ${firebaseError.message}`;
                    }
                    setFeedback({ type: 'error', message: `Invio fallito. Dettagli: ${errorMessage}` });
                }
            }
        );
    };

    const handleToggleDisabled = async (id: string, isDisabled: boolean, nome: string) => {
        const action = isDisabled ? 'abilitare' : 'disabilitare';
        openConfirmationDialog(
            `Conferma ${isDisabled ? 'Abilitazione' : 'Disabilitazione'}`,
            `Sei sicuro di voler ${action} l'utente ${nome}?`,
            async () => {
                 if (!hasTemporaryAdminAccess || id === user?.uid) {
                    setFeedback({ type: 'info', message: 'Azione non permessa.' });
                    return;
                }
                const userRef = doc(db, 'utenti_master', id);
                try {
                    await updateDoc(userRef, { disabled: !isDisabled });
                    fetchUtenti();
                    setFeedback({ type: 'success', message: `Stato utente aggiornato.` });
                } catch (error) {
                    console.error("Errore handleToggleDisabled:", error);
                    setFeedback({ type: 'error', message: "Errore durante l'aggiornamento." });
                }
            }
        );
    };

    const handleDeleteUser = async (id: string, nome: string) => {
        openConfirmationDialog(
            'Conferma Eliminazione Utente',
            `Sei sicuro di voler eliminare l'utente ${nome}? L'azione è irreversibile.`,
            async () => {
                if (!hasTemporaryAdminAccess || id === user?.uid) {
                    setFeedback({ type: 'info', message: 'Azione non permessa.' });
                    return;
                }
                try {
                    await deleteDoc(doc(db, 'utenti_master', id));
                    fetchUtenti();
                    setFeedback({ type: 'success', message: "Utente eliminato con successo." });
                } catch (error) {
                    console.error("Errore handleDeleteUser:", error);
                    setFeedback({ type: 'error', message: "Errore durante l'eliminazione dell'utente." });
                }
            }
        );
    };

    const handleRoleChange = async (id: string, event: SelectChangeEvent<UserRole>) => {
        const newRole = event.target.value as UserRole;
        if (!hasTemporaryAdminAccess) {
            setFeedback({ type: 'info', message: 'Azione non permessa.' });
            return;
        }
        const userRef = doc(db, 'utenti_master', id);
        try {
            await updateDoc(userRef, { ruolo: newRole });
            fetchUtenti();
            setFeedback({ type: 'success', message: `Ruolo aggiornato.` });
        } catch (error) {
            console.error("Errore handleRoleChange:", error);
            setFeedback({ type: 'error', message: "Errore durante l'aggiornamento del ruolo." });
        }
    };

    const handleAddUser = () => setOpenAddDialog(true);
    const handleCloseAddDialog = () => {
        if (!saving) setOpenAddDialog(false);
    };
    
    const handleSaveNewUser = async () => {
        setSaving(true);
        setFeedback(null);

        const functions = getFunctions();
        const createUser = httpsCallable(functions, 'createNewUser');

        try {
            const result = await createUser(newUser);
            const { data } = result as { data: { status: string; message: string; newUser: Utente } };

            if (data.status === 'success') {
                setUtenti(prev => [...prev, data.newUser]);
                setFeedback({ type: 'success', message: data.message });
                handleCloseAddDialog();
                setNewUser({ nome: '', email: '', ruolo: 'user' as UserRole });
            } else {
                throw new Error(data.message || 'Si è verificato un errore sconosciuto.');
            }
        } catch (error: any) {
            console.error("Errore creazione utente:", error);
            setFeedback({ type: 'error', message: error.message || "Impossibile creare l'utente." });
        } finally {
            setSaving(false);
        }
    };

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'email', headerName: 'Email', flex: 1.5 },
        { field: 'stato', headerName: 'Stato', width: 120, renderCell: (params) => (<Typography color={!params.row.disabled ? 'success.main' : 'error.main'}>{!params.row.disabled ? 'Attivo' : 'Disabilitato'}</Typography>),},
        { 
            field: 'ruolo', 
            headerName: 'Ruolo', 
            flex: 1, 
            renderCell: (params) => (
                <FormControl fullWidth variant="standard" sx={{ m: -1 }}>
                    <Select value={params.value as UserRole} onChange={(e) => handleRoleChange(params.row.id, e)} disabled={!hasTemporaryAdminAccess} sx={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', '& .MuiSelect-select:focus': { backgroundColor: 'transparent' }, '&::before': { border: 'none' }, '&:hover::before': { border: 'none!important' } }}>
                        <MenuItem key="admin" value="admin">Admin</MenuItem>
                        <MenuItem key="user" value="user">User</MenuItem>
                    </Select>
                </FormControl>
            ),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 160,
            getActions: ({ id, row }) => [
                <GridActionsCellItem key={`toggle-${id}`} icon={<Tooltip title={row.disabled ? 'Abilita Utente' : 'Disabilita Utente'}>{row.disabled ? <ToggleOn color="success" /> : <ToggleOff color="action" />}</Tooltip>} label={row.disabled ? 'Abilita' : 'Disabilita'} onClick={() => handleToggleDisabled(id as string, row.disabled, row.nome)} disabled={!hasTemporaryAdminAccess || id === user?.uid} />,
                <GridActionsCellItem key={`delete-${id}`} icon={<Tooltip title="Elimina Utente"><Delete /></Tooltip>} label="Elimina" onClick={() => handleDeleteUser(id as string, row.nome)} disabled={!hasTemporaryAdminAccess || id === user?.uid} color="error"/>,
                <GridActionsCellItem key={`reset-${id}`} icon={<Tooltip title="Invia/Reset Password"><VpnKey /></Tooltip>} label="Reset Password" onClick={() => handleResetPassword(row.email)} color="primary" disabled={!hasTemporaryAdminAccess} />,
            ],
        },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
             <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>Gestione Ruoli e Accessi</Typography>
                {hasTemporaryAdminAccess && (
                    <Button variant="contained" startIcon={<Add />} onClick={handleAddUser}>
                        Aggiungi Utente
                    </Button>
                )}
            </Box>
            {feedback && <Alert severity={feedback.type} sx={{ flexShrink: 0, mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            
            {loading ? <CircularProgress sx={{ m: 'auto' }} /> : error ? <Alert severity="error">{error}</Alert> : 
                <Box sx={{ flexGrow: 1, width: '100%' }}>
                    <DataGrid
                        rows={utenti}
                        columns={columns}
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                        initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'nome', sort: 'asc' }] } }}
                        pageSizeOptions={[10, 25, 50]}
                        slots={{ toolbar: GridToolbar }}
                        disableRowSelectionOnClick
                    />
                </Box>
            }
             <Dialog open={openAddDialog} onClose={handleCloseAddDialog}>
                <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" label="Nome" type="text" fullWidth variant="standard" value={newUser.nome} onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })} disabled={saving} />
                    <TextField margin="dense" label="Email" type="email" fullWidth variant="standard" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} disabled={saving} />
                    <FormControl fullWidth margin="dense" variant="standard">
                        <Select value={newUser.ruolo} onChange={(e) => setNewUser({ ...newUser, ruolo: e.target.value as UserRole })} disabled={saving}>
                            <MenuItem key="user-role" value="user">User</MenuItem>
                            <MenuItem key="admin-role" value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddDialog} disabled={saving}>Annulla</Button>
                    <Button onClick={handleSaveNewUser} disabled={saving}>
                        {saving ? <CircularProgress size={24} /> : 'Salva'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmationDialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={() => {
                    confirmDialogProps.onConfirm();
                    setConfirmDialogOpen(false);
                }}
                title={confirmDialogProps.title}
                description={confirmDialogProps.description}
            />
        </Box>
    );
};

export default GestioneUtentiTab;
