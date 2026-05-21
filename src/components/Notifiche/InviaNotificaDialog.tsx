
import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
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
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            setError('Titolo e messaggio sono obbligatori.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await addDoc(collection(db, 'notifications'), {
                title: title.trim(),
                message: message.trim(),
                target: target, 
                createdAt: serverTimestamp(),
                status: 'unread',
                readAt: null,
                readBy: null,
            });
            handleClose();
        } catch (err) {
            console.error("Errore nell'invio della notifica:", err);
            setError('Si è verificato un errore durante l\'invio.'); // CORREZIONE
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setMessage('');
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
                    id="message"
                    label="Messaggio"
                    type="text"
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={handleClose} color="secondary">Annulla</Button>
                <Box sx={{ position: 'relative' }}>
                    <Button 
                        onClick={handleSend} 
                        variant="contained" 
                        disabled={loading}
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
