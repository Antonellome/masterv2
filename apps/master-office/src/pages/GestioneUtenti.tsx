import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext'; // Uso il nostro hook!
import {
    Box, Typography, Alert, CircularProgress, Select, MenuItem, FormControl, SelectChangeEvent
} from '@mui/material';
// CORREZIONE: Separato l'import di itIT
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import type { UserRole } from '@/contexts/AuthContext';

interface AppUser {
    id: string;
    email: string;
    nome?: string;
    cognome?: string;
    ruolo: UserRole;
}

const GestioneUtenti = () => {
    const { isAdmin } = useAuth(); // Controllo se l'utente corrente è admin
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const querySnapshot = await getDocs(collection(db, "utenti_master"));
                const usersData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    email: doc.data().email || 'N/D',
                    nome: doc.data().nome || '',
                    cognome: doc.data().cognome || '',
                    ruolo: doc.data().ruolo || 'user', 
                } as AppUser));
                setUsers(usersData);
            } catch (err) {
                console.error("Errore nel caricamento degli utenti:", err);
                setError("Impossibile caricare l'elenco degli utenti.");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        if (!isAdmin) {
            setFeedback({ type: 'error', message: 'Non hai i permessi per modificare i ruoli.' });
            return;
        }

        const userRef = doc(db, 'utenti_master', userId);
        try {
            await updateDoc(userRef, { ruolo: newRole });
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, ruolo: newRole } : u));
            setFeedback({ type: 'success', message: `Ruolo aggiornato a ${newRole}.` });
        } catch (error) {
            console.error("Errore durante l'aggiornamento del ruolo:", error);
            setFeedback({ type: 'error', message: "Errore durante l'aggiornamento." });
        }
    };

    const columns: GridColDef[] = [
        { field: 'email', headerName: 'Email', flex: 1.5 },
        { field: 'cognome', headerName: 'Cognome', flex: 1 },
        { field: 'nome', headerName: 'Nome', flex: 1 },
        {
            field: 'ruolo',
            headerName: 'Ruolo',
            flex: 1,
            renderCell: (params) => (
                <FormControl fullWidth variant="standard">
                    <Select
                        value={params.value as UserRole}
                        onChange={(e: SelectChangeEvent<UserRole>) => handleRoleChange(params.row.id, e.target.value as UserRole)}
                        disabled={!isAdmin} // Disabilitato se non sei admin
                        sx={{
                           fontSize: 'inherit',
                           fontWeight: 'inherit',
                           color: 'inherit',
                           '& .MuiSelect-select:focus': { backgroundColor: 'transparent' },
                           '&::before': { borderBottom: 'none' },
                           '&:hover::before': { borderBottom: 'none!important' },
                           '& .MuiSvgIcon-root': { visibility: isAdmin ? 'visible' : 'hidden' }
                        }}
                    >
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="user">User</MenuItem>
                    </Select>
                </FormControl>
            ),
        },
    ];

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Typography variant="h5" component="h1" gutterBottom>
                Gestione Utenti
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Qui puoi visualizzare gli utenti della piattaforma e modificare il loro ruolo. Solo gli amministratori possono effettuare modifiche.
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {feedback && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}

            <Box sx={{ height: 'auto', width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={columns}
                    autoHeight
                    localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                    initialState={{
                        pagination: { paginationModel: { page: 0, pageSize: 10 } },
                        sorting: { sortModel: [{ field: 'cognome', sort: 'asc' }] }
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    slots={{ toolbar: GridToolbar }}
                    disableRowSelectionOnClick
                    sx={{ border: 0 }}
                />
            </Box>
        </Box>
    );
};

export default GestioneUtenti;
