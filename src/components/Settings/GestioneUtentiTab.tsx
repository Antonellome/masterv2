
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
    Box, Typography, Alert, CircularProgress, Tooltip, Select, MenuItem, FormControl, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, SelectChangeEvent
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { Add, Delete, ToggleOn, ToggleOff, VpnKey } from '@mui/icons-material';
import type { UserRole } from '@/contexts/AuthContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface Utente {
    id: string;
    nome: string;
    email: string;
    disabled: boolean;
    ruolo: UserRole;
}

// Definisco un tipo per la risposta della funzione di creazione utente
interface CreateUserResult {
    status: string;
    message: string;
    newUser: Utente;
}

const functions = getFunctions();
const setUserStatusFunction = httpsCallable(functions, 'setUserDisabledStatus');
const deleteUserFunction = httpsCallable(functions, 'deleteUser');
const createUserFunction = httpsCallable<object, CreateUserResult>(functions, 'createNewUser');

const GestioneUtentiTab: React.FC = () => {
    const { isAdmin, user, loading: authLoading } = useAuth();
    const hasAdminAccess = isAdmin || user?.uid === 'sm6w10dUiHcEs5p1zdFmWlreKAd2';

    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
                disabled: doc.data().disabled || false,
            } as Utente));
            setUtenti(utentiData);
        } catch (err) {
            console.error("Errore nel caricamento degli utenti:", err);
            setFeedback({ type: 'error', message: "Impossibile caricare l'elenco degli utenti." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && hasAdminAccess) {
            fetchUtenti();
        }
    }, [hasAdminAccess, authLoading, fetchUtenti]);

    const openConfirmationDialog = (title: string, description: string, onConfirm: () => void) => {
        setConfirmDialogProps({ title, description, onConfirm });
        setConfirmDialogOpen(true);
    };
    
    const handleToggleDisabled = (id: string, isDisabled: boolean, nome: string) => {
        const actionText = isDisabled ? 'abilitare' : 'disabilitare';
        openConfirmationDialog(
            `Conferma ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
            `Sei sicuro di voler ${actionText} l'utente ${nome}?`,
            async () => {
                try {
                    // **FIX**: La funzione si aspetta il NUOVO stato, che è l'opposto di quello attuale.
                    await setUserStatusFunction({ uid: id, disabled: !isDisabled });
                    // **FIX**: Ricaricare i dati è FONDAMENTALE per aggiornare l'UI.
                    await fetchUtenti(); 
                    setFeedback({ type: 'success', message: `Utente ${nome} ${!isDisabled ? 'disabilitato' : 'abilitato'} con successo.` });
                } catch (error: any) {
                    setFeedback({ type: 'error', message: error.message || "Errore nell'aggiornamento dello stato." });
                }
            }
        );
    };

    const handleDeleteUser = (id: string, nome: string) => {
        openConfirmationDialog(
            'Conferma Eliminazione Utente',
            `Sei sicuro di voler eliminare DEFINITIVAMENTE l'utente ${nome}? L'azione è irreversibile.`,
            async () => {
                try {
                    await deleteUserFunction({ uid: id });
                    await fetchUtenti();
                    setFeedback({ type: 'success', message: "Utente eliminato con successo." });
                } catch (error: any) {
                    setFeedback({ type: 'error', message: error.message || "Errore durante l'eliminazione." });
                }
            }
        );
    };
    
    const handleRoleChange = async (id: string, event: SelectChangeEvent<UserRole>) => {
        const newRole = event.target.value as UserRole;
        try {
            await updateDoc(doc(db, 'utenti_master', id), { ruolo: newRole });
            await fetchUtenti();
            setFeedback({ type: 'success', message: `Ruolo aggiornato con successo.` });
        } catch (error) {
            setFeedback({ type: 'error', message: "Errore durante l'aggiornamento del ruolo." });
        }
    };

    const handleSaveNewUser = async () => {
        if (!newUser.email || !newUser.nome) {
            setFeedback({ type: 'error', message: 'Nome e Email sono obbligatori.' });
            return;
        }
        setSaving(true);
        try {
            // **FIX**: Aspetta il risultato dalla funzione per ottenere il nuovo utente con il suo ID.
            const result: HttpsCallableResult<CreateUserResult> = await createUserFunction(newUser);
            const createdUser = result.data.newUser;

            // **FIX**: Aggiorna lo stato locale invece di ricaricare tutto, più efficiente.
            setUtenti(prev => [...prev, createdUser]);
            
            setFeedback({ type: 'success', message: `Utente ${createdUser.nome} creato con successo!` });
            setOpenAddDialog(false);
            setNewUser({ nome: '', email: '', ruolo: 'user' });
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message || "Impossibile creare l'utente." });
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = (email: string) => {
        openConfirmationDialog(
            'Conferma Reset Password',
            `Inviare un'email di reset password a ${email}?`,
            async () => {
                try {
                    await sendPasswordResetEmail(getAuth(), email);
                    setFeedback({ type: 'success', message: `Email di reset inviata a ${email}.` });
                } catch (error: any) {
                    setFeedback({ type: 'error', message: error.message || `Invio fallito.` });
                }
            }
        );
    };
    
    const columns: GridColDef<Utente>[] = [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'email', headerName: 'Email', flex: 1.5 },
        { 
            field: 'disabled', 
            headerName: 'Stato', 
            width: 120, 
            renderCell: ({ value }) => (
                <Typography color={!value ? 'success.main' : 'error.main'} component="span" sx={{ fontWeight: 'bold' }}>
                    {!value ? 'Attivo' : 'Disabilitato'}
                </Typography>
            ),
        },
        { 
            field: 'ruolo', 
            headerName: 'Ruolo', 
            flex: 1, 
            renderCell: (params) => (
                <FormControl fullWidth variant="standard" sx={{ m: -1 }}>
                    <Select value={params.value} onChange={(e) => handleRoleChange(params.row.id, e)} disabled={!hasAdminAccess || params.id === user?.uid} sx={{ fontSize: 'inherit', color: 'inherit', '&::before': { border: 'none' }, '&:hover::before': { border: 'none!important' } }}>
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="user">User</MenuItem>
                    </Select>
                </FormControl>
            ),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 150,
            getActions: ({ id, row }) => { 
                const isSelf = id === user?.uid;
                return [
                    <GridActionsCellItem key={`toggle-${id}`} icon={<Tooltip title={row.disabled ? 'Abilita Accesso' : 'Disabilita Accesso'}>{row.disabled ? <ToggleOn color="success"/> : <ToggleOff color="action"/>}</Tooltip>} label={row.disabled ? 'Abilita' : 'Disabilita'} onClick={() => handleToggleDisabled(id as string, row.disabled, row.nome)} disabled={!hasAdminAccess || isSelf} />, 
                    <GridActionsCellItem key={`delete-${id}`} icon={<Tooltip title="Elimina Utente"><Delete /></Tooltip>} label="Elimina" onClick={() => handleDeleteUser(id as string, row.nome)} disabled={!hasAdminAccess || isSelf} color="error" />, 
                    <GridActionsCellItem key={`reset-${id}`} icon={<Tooltip title="Invia Email di Reset Password"><VpnKey /></Tooltip>} label="Reset Password" onClick={() => handleResetPassword(row.email)} disabled={!hasAdminAccess || !row.email} />
                ]; 
            },
        },
    ];

    if (authLoading) {
        return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
    }

    if (!hasAdminAccess) {
        return <Alert severity="error" sx={{ mt: 2 }}>Non hai i permessi per visualizzare questa sezione.</Alert>;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Gestione Ruoli e Accessi</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddDialog(true)}>
                    Aggiungi Utente
                </Button>
            </Box>
            {feedback && <Alert severity={feedback.type} sx={{ flexShrink: 0, mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            {loading ? <CircularProgress sx={{ m: 'auto' }} /> : 
                <Box sx={{ flexGrow: 1, width: '100%' }}>
                    <DataGrid rows={utenti || []} columns={columns} localeText={itIT.components.MuiDataGrid.defaultProps.localeText} initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'nome', sort: 'asc' }] } }} pageSizeOptions={[10, 25, 50]} slots={{ toolbar: GridToolbar }} disableRowSelectionOnClick />
                </Box>
            }
            <Dialog open={openAddDialog} onClose={() => !saving && setOpenAddDialog(false)} fullWidth maxWidth="xs">
                <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
                <DialogContent><TextField autoFocus margin="dense" label="Nome Completo" type="text" fullWidth variant="standard" value={newUser.nome} onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })} disabled={saving} /><TextField margin="dense" label="Indirizzo Email" type="email" fullWidth variant="standard" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} disabled={saving} /><FormControl fullWidth margin="dense" variant="standard"><Select value={newUser.ruolo} onChange={(e) => setNewUser({ ...newUser, ruolo: e.target.value as UserRole })} disabled={saving}><MenuItem value="user">User</MenuItem><MenuItem value="admin">Admin</MenuItem></Select></FormControl></DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}><Button onClick={() => setOpenAddDialog(false)} disabled={saving}>Annulla</Button><Button onClick={handleSaveNewUser} variant="contained" disabled={saving}>{saving ? <CircularProgress size={24} /> : 'Salva'}</Button></DialogActions>
            </Dialog>
            <ConfirmationDialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} onConfirm={() => { confirmDialogProps.onConfirm(); setConfirmDialogOpen(false); }} title={confirmDialogProps.title} description={confirmDialogProps.description} />
        </Box>
    );
};

export default GestioneUtentiTab;
