
import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText,
  TextField, InputAdornment, Tooltip, IconButton, CircularProgress
} from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AutorenewIcon from '@mui/icons-material/Autorenew';

// Interfaccia per l'utente, necessaria per i dialoghi
interface User {
  id: string;
  nome: string;
  email: string;
  ruolo: 'admin' | 'user';
}

// --- Dialog Creazione Utente ---
export const NuovoUtenteDialog = ({ open, onClose, onSave, isSaving }: { open: boolean, onClose: () => void, onSave: (nome: string, email: string, password: string) => void, isSaving: boolean }) => {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const generateRandomPassword = () => {
        const length = 10;
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        let newPassword = '';
        for (let i = 0; i < length; i++) {
            newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPassword);
    };

    const handleSave = () => {
        if (nome && email && password) {
            onSave(nome, email, password);
            setNome('');
            setEmail('');
            setPassword('');
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Crea un nuovo utente con una password temporanea. L'utente riceverà un'email per impostare la propria password definitiva.
                </DialogContentText>
                <TextField autoFocus margin="dense" label="Nome e Cognome" type="text" fullWidth variant="standard" value={nome} onChange={(e) => setNome(e.target.value)} />
                <TextField margin="dense" label="Indirizzo Email" type="email" fullWidth variant="standard" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField
                    margin="dense"
                    label="Password Temporanea"
                    type="text"
                    fullWidth
                    variant="standard"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    helperText="Comunica questa password all'utente per l'accesso immediato."
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><VpnKeyIcon /></InputAdornment>,
                        endAdornment: (
                            <InputAdornment position="end">
                                <Tooltip title="Genera password casuale">
                                    <IconButton onClick={generateRandomPassword} edge="end">
                                        <AutorenewIcon />
                                    </IconButton>
                                </Tooltip>
                            </InputAdornment>
                        )
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={handleSave} disabled={isSaving || !nome || !email || !password}>
                    {isSaving ? <CircularProgress size={24} /> : 'Salva e Invia Email'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// --- Dialogo Modifica Utente ---
export const ModificaUtenteDialog = ({ open, onClose, onSave, isSaving, user }: { open: boolean, onClose: () => void, onSave: (id: string, nome: string) => void, isSaving: boolean, user: User | null }) => {
    const [nome, setNome] = useState('');

    useEffect(() => {
        if (user) {
            setNome(user.nome || '');
        }
    }, [user]);

    const handleSave = () => {
        if (user && nome) {
            onSave(user.id, nome);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Modifica Utente</DialogTitle>
            <DialogContent>
                 <DialogContentText sx={{ mb: 2 }}>
                    Modifica il nome dell'utente. L'email non può essere modificata.
                </DialogContentText>
                <TextField autoFocus margin="dense" id="edit-name" label="Nome e Cognome" type="text" fullWidth variant="standard" value={nome} onChange={(e) => setNome(e.target.value)} />
                <TextField margin="dense" id="edit-email" label="Indirizzo Email" type="email" fullWidth variant="standard" value={user?.email || ''} disabled />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={handleSave} disabled={isSaving || !nome}>
                    {isSaving ? <CircularProgress size={24} /> : 'Salva Modifiche'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// --- Dialogo Conferma Eliminazione ---
export const ConfermaEliminazioneDialog = ({ open, onClose, onConfirm, isSaving, user }: { open: boolean, onClose: () => void, onConfirm: () => void, isSaving: boolean, user: User | null }) => (
    <Dialog open={open} onClose={onClose}>
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
            <DialogContentText dangerouslySetInnerHTML={{ __html: `Sei sicuro di voler eliminare definitivamente l'utente <strong>${user?.nome}</strong> (${user?.email})? L'azione è irreversibile.` }} />
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
            <Button onClick={onConfirm} color="error" disabled={isSaving}>
                {isSaving ? <CircularProgress size={24} /> : 'Elimina'}
            </Button>
        </DialogActions>
    </Dialog>
);
