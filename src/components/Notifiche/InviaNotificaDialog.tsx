
import React, { useState } from 'react';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    CircularProgress,
    Typography,
    Alert
} from '@mui/material';
import type { NotificationTarget } from '@/models/definitions';

interface InviaNotificaDialogProps {
    open: boolean;
    onClose: () => void;
    target: NotificationTarget | null;
}

const InviaNotificaDialog: React.FC<InviaNotificaDialogProps> = ({ open, onClose, target }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            setError('Titolo e corpo sono obbligatori.');
            return;
        }
        if (!target) {
            setError('Destinatario della notifica non specificato.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const sendNotification = httpsCallable(functions, 'sendNotification');

            const payload = {
                title: title.trim(),
                body: body.trim(),
                targetType: target.type,
                targetId: target.id,
                targetName: target.name, // Aggiunto per il logging nella funzione
            };

            await sendNotification(payload);
            
            handleClose();

        } catch (err: unknown) {
            const httpsError = err as { code: string; message: string };
            console.error("Errore durante l'invio della notifica:", httpsError);
            
            let errorMessage = 'Si è verificato un errore sconosciuto.';
            if (httpsError.code === 'unauthenticated') {
                errorMessage = 'Autenticazione richiesta. Effettua nuovamente il login.';
            } else if (httpsError.code === 'permission-denied') {
                errorMessage = 'Non hai i permessi per eseguire questa operazione.';
            } else if (httpsError.message) {
                errorMessage = httpsError.message;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setBody('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>
                Invia Notifica a <Typography component="span" color="primary.main" fontWeight="bold">{target?.name || 'sconosciuto'}</Typography>
            </DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TextField
                    autoFocus
                    margin="dense"
                    id="title"
                    label="Titolo"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <TextField
                    margin="dense"
                    id="body"
                    label="Corpo del messaggio"
                    type="text"
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                />
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={handleClose} color="secondary">Annulla</Button>
                <Box sx={{ position: 'relative' }}>
                    <Button
                        onClick={handleSend}
                        variant="contained"
                        disabled={loading || !title.trim() || !body.trim()}
                    >
                        Invia
                    </Button>
                    {loading && (
                        <CircularProgress
                            size={24}
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-12px',
                                marginLeft: '-12px',
                            }}
                        />
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default InviaNotificaDialog;
