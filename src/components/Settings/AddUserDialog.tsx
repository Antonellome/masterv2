
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Grid
} from '@mui/material';

const manageUsersCallable = httpsCallable(functions, 'manageUsers');

interface AddUserDialogProps {
    open: boolean;
    onClose: () => void;
    onUserAdded: () => void; 
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose, onUserAdded }) => {
    const [email, setEmail] = useState('');
    const [nome, setNome] = useState('');
    const [ruolo, setRuolo] = useState<'utente' | 'admin'>('utente');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const validateEmail = (email: string) => {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
    };

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);

        if (!nome || !email) {
            setError("Nome e Email sono campi obbligatori.");
            return;
        }

        if (!validateEmail(email)) {
            setError("Inserisci un indirizzo email valido.");
            return;
        }

        setLoading(true);

        try {
            const payload = { 
                email,
                nome,
                ruolo 
            };

            await manageUsersCallable({ action: 'addUser', payload });
            
            setSuccess(`Utente ${email} creato con successo! Verrà inviata un'email per l'impostazione della password.`);
            
            onUserAdded(); // Refresh data in parent

            setTimeout(() => {
                handleClose();
            }, 2500);

        } catch (err: any) {
            console.error("Errore durante la creazione dell'utente:", err);
            setError(err.message || "Si è verificato un errore sconosciuto.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setNome('');
        setRuolo('utente');
        setError(null);
        setSuccess(null);
        setLoading(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ mt: 2 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                autoFocus
                                margin="dense"
                                id="nome"
                                label="Nome"
                                type="text"
                                fullWidth
                                variant="outlined"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                disabled={loading || !!success}
                            />
                        </Grid>
                         <Grid item xs={12}>
                             <TextField
                                margin="dense"
                                id="email"
                                label="Indirizzo Email"
                                type="email"
                                fullWidth
                                variant="outlined"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading || !!success}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth margin="dense">
                                <InputLabel id="ruolo-label">Ruolo</InputLabel>
                                <Select
                                    labelId="ruolo-label"
                                    id="ruolo"
                                    value={ruolo}
                                    label="Ruolo"
                                    onChange={(e) => setRuolo(e.target.value as 'utente' | 'admin')}
                                    disabled={loading || !!success}
                                >
                                    <MenuItem value={'utente'}>Utente Standard</MenuItem>
                                    <MenuItem value={'admin'}>Amministratore</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={handleClose} color="secondary" disabled={loading}>Annulla</Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    color="primary" 
                    disabled={loading || !!success}
                >
                    {loading ? <CircularProgress size={24} /> : "Aggiungi Utente"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddUserDialog;
