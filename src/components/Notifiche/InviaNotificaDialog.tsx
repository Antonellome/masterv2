
import React, { useState, useEffect } from 'react';
// Importazioni aggiornate per supportare scritture batch e query complesse
import { collection, doc, writeBatch, Timestamp, getDocs, query, where } from 'firebase/firestore';
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

/**
 * Invia una o più notifiche in modo efficiente usando un batch di Firestore.
 * Gestisce l'invio a un singolo utente, a una categoria o a tutti i tecnici abilitati.
 * @param target Il destinatario (singolo, categoria, o tutti).
 * @param title Il titolo della notifica.
 * @param body Il corpo del messaggio.
 * @returns Il numero di notifiche inviate.
 */
const sendBulkNotifications = async (target: NotificationTarget, title: string, body: string): Promise<number> => {
    if (!target || !title || !body) {
        throw new Error('Destinatario, titolo e corpo sono obbligatori.');
    }

    const batch = writeBatch(db);
    const notificheCollectionRef = collection(db, 'notifiche');
    const targetTecniciIds: string[] = [];

    if (target.type === 'user') {
        targetTecniciIds.push(target.id);
    } else {
        // Logica per 'category' o 'all'
        const tecniciCollectionRef = collection(db, 'tecnici');
        let q;

        if (target.type === 'category') {
            // Invia a tutti i tecnici abilitati appartenenti a una categoria.
            // Assumo che il campo nel documento del tecnico si chiami 'categoria'.
            q = query(tecniciCollectionRef, where('appAccess', '==', true), where('categoria', '==', target.id));
        } else { // target.type === 'all'
            // Invia a tutti i tecnici con accesso abilitato.
            q = query(tecniciCollectionRef, where('appAccess', '==', true));
        }
        
        const tecniciSnapshot = await getDocs(q);
        if (tecniciSnapshot.empty) {
            throw new Error('Nessun tecnico corrispondente trovato. Impossibile inviare.');
        }
        tecniciSnapshot.forEach(doc => targetTecniciIds.push(doc.id));
    }

    if (targetTecniciIds.length === 0) {
        throw new Error('Nessun tecnico destinatario valido trovato.');
    }

    // Aggiunge un'operazione di scrittura al batch per ogni ID tecnico.
    targetTecniciIds.forEach(tecnicoId => {
        const newNotificaRef = doc(notificheCollectionRef); // Genera un ID univoco per ogni notifica
        batch.set(newNotificaRef, {
            tecnicoId: tecnicoId,
            title: title,
            body: body,
            createdAt: Timestamp.now(),
            isRead: false,
        });
    });

    // Esegue l'operazione batch.
    await batch.commit();
    return targetTecniciIds.length;
};


const InviaNotificaDialog: React.FC<InviaNotificaDialogProps> = ({ open, onClose, target }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Effetto per pulire lo stato del form quando il dialogo viene chiuso.
    useEffect(() => {
        if (!open) {
            // Il timeout permette all'animazione di chiusura di completarsi.
            setTimeout(() => {
                setTitle('');
                setBody('');
                setError('');
                setSuccess('');
                setLoading(false);
            }, 300);
        }
    }, [open]);

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            setError('Titolo e corpo sono obbligatori.');
            return;
        }
        if (!target) {
            setError('Destinatario non specificato.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const count = await sendBulkNotifications(target, title.trim(), body.trim());
            setSuccess(`Notifica inviata con successo a ${count} ${count > 1 ? 'tecnici' : 'tecnico'}.`);
            
            // Mostra il messaggio di successo, poi chiude il dialogo.
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error("Errore durante l'invio della notifica:", err);
            setError(err.message || 'Si è verificato un errore sconosciuto.');
            setLoading(false); // Sblocca il form in caso di errore
        }
    };

    const handleCancel = () => {
        if (!loading) {
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="sm">
            <DialogTitle>
                Invia Notifica a <Typography component="span" color="primary.main" fontWeight="bold">{target?.name || 'destinatario'}</Typography>
            </DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

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
                    disabled={loading || !!success}
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
                    disabled={loading || !!success}
                />
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={handleCancel} color="secondary" disabled={loading}>Annulla</Button>
                <Box sx={{ position: 'relative' }}>
                    <Button
                        onClick={handleSend}
                        variant="contained"
                        disabled={loading || !title.trim() || !body.trim() || !!success}
                    >
                        {loading ? 'Invio in corso...' : 'Invia'}
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
