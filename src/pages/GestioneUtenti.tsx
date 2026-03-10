import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Box, Typography, Alert, CircularProgress, Snackbar, TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import DeleteIcon from '@mui/icons-material/Delete';

// Interfaccia utente ultra-semplificata: solo id ed email
interface MasterAppUser {
    id: string;
    email: string;
}

const GestioneUtenti = () => {
    const [users, setUsers] = useState<MasterAppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // State per la dialog di creazione nuovo utente
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
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = async () => {
        if (!newUserEmail) {
            setSnackbar({ open: true, message: 'L\'email non può essere vuota.', severity: 'error' });
            return;
        }
        try {
            // Aggiunge il documento solo con l'email, senza ruoli.
            await addDoc(collection(db, "utenti_master"), { email: newUserEmail });
            setSnackbar({ open: true, message: 'Nuovo utente abilitato con successo!', severity: 'success' });
            setNewUserEmail('');
            setOpenDialog(false);
            fetchUsers(); // Ricarica la lista
        } catch (err) {
            console.error("Errore nella creazione dell'utente:", err);
            setSnackbar({ open: true, message: 'Errore durante l\'abilitazione del nuovo utente.', severity: 'error' });
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('Sei sicuro di voler rimuovere l\'accesso a questo utente?')) return;
        try {
            await deleteDoc(doc(db, 'utenti_master', id));
            setSnackbar({ open: true, message: 'Utente rimosso con successo.', severity: 'success' });
            fetchUsers(); // Ricarica la lista
        } catch (err) {
            console.error("Errore nella rimozione dell'utente:", err);
            setSnackbar({ open: true, message: 'Errore durante la rimozione dell\'utente.', severity: 'error' });
        }
    };

    const columns: GridColDef[] = [
        { field: 'email', headerName: 'Email Utente Abilitato', flex: 1 },
        {
            field: 'actions',
            headerName: 'Rimuovi',
            sortable: false,
            disableColumnMenu: true,
            width: 100,
            align: 'center',
            renderCell: (params) => (
                <IconButton onClick={() => handleDeleteUser(params.id as string)} color="error">
                    <DeleteIcon />
                </IconButton>
            ),
        },
    ];

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1">
                    Gestione Accessi Applicazione
                </Typography>
                <Button variant="contained" onClick={() => setOpenDialog(true)}>Abilita Nuovo Utente</Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Questa lista contiene le email degli utenti autorizzati ad accedere a questa applicazione. Tutti gli utenti hanno gli stessi permessi.
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ height: 'auto', width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={columns}
                    autoHeight
                    localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                    initialState={{ 
                        sorting: { sortModel: [{ field: 'email', sort: 'asc' }] }
                    }}
                    slots={{ toolbar: GridToolbar }}
                    disableRowSelectionOnClick
                    sx={{ border: 0 }}
                />
            </Box>

            {/* Dialog per abilitare un nuovo utente */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Abilita Nuovo Utente</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="email"
                        label="Indirizzo Email dell'Utente da Abilitare"
                        type="email"
                        fullWidth
                        variant="standard"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Annulla</Button>
                    <Button onClick={handleCreateUser}>Abilita</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
            />
        </Box>
    );
};

export default GestioneUtenti;
