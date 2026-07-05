
import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase'; // Assicurati che il percorso di importazione sia corretto
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

/**
 * Invia una notifica a un tecnico specifico scrivendo un documento su Firestore.
 * @param tecnicoId L'UID del tecnico.
 * @param title Il titolo della notifica.
 * @param body Il corpo del messaggio.
 * @returns L'ID della notifica creata.
 */
const inviaNotificaFirestore = async (tecnicoId: string, title: string, body: string): Promise<string> => {
    if (!tecnicoId || !title || !body) {
        throw new Error('Tutti i campi (tecnicoId, titolo, corpo) sono obbligatori.');
    }

    try {
        const notificheCollection = collection(db, 'notifiche');
        const nuovoDoc = await addDoc(notificheCollection, {
            tecnicoId: tecnicoId,
            title: title,
            body: body,
            createdAt: Timestamp.now(),
            isRead: false,
        });
        console.log(`Documento notifica creato con successo con ID: ${nuovoDoc.id}`);
        return nuovoDoc.id;
    } catch (error) {
        console.error("Errore durante la scrittura della notifica su Firestore:", error);
        throw new Error("Impossibile salvare la notifica su Firestore.");
    }
};

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
        // Il target deve essere un tecnico singolo, quindi il type deve essere 'tecnico'
        if (!target || target.type !== 'tecnico' || !target.id) {
            setError('Destinatario non valido. Selezionare un tecnico specifico.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Chiamata alla nuova funzione che scrive direttamente su Firestore
            await inviaNotificaFirestore(target.id, title.trim(), body.trim());
            handleClose(true); // Passa true per indicare successo

        } catch (err: any) {
            console.error("Errore durante l'invio della notifica:", err);
            setError(err.message || 'Si è verificato un errore sconosciuto.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (isSuccess = false) => {
        if (!isSuccess) {
            onClose(); // Chiama l'onClose del genitore per la notifica di successo
        }
        setTitle('');
        setBody('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={() => handleClose(false)} fullWidth maxWidth="sm">
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
                <Button onClick={() => handleClose(false)} color="secondary">Annulla</Button>
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
