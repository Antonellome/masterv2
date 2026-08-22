
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Avatar,
    Divider,
    Chip
} from '@mui/material';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Notifica } from '@/models/definitions';
import PeopleIcon from '@mui/icons-material/People';

interface ReadByEntry {
  uid: string;
  nome: string;
  readAt: Timestamp;
}

// Interfaccia per le props del componente
interface DettaglioNotificaDialogProps {
    open: boolean;
    onClose: () => void;
    notifica: Notifica | null;
}

const DettaglioNotificaDialog: React.FC<DettaglioNotificaDialogProps> = ({ open, onClose, notifica }) => {
    const [readers, setReaders] = useState<ReadByEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!open || !notifica?.id) {
            setReaders([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const unsubscribe = onSnapshot(doc(db, 'notificheRichieste', notifica.id), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();

                const readByData = Array.isArray(data.readBy) ? data.readBy : [];
                
                readByData.sort((a, b) => {
                    const timeA = a.readAt?.toMillis() || 0;
                    const timeB = b.readAt?.toMillis() || 0;
                    return timeB - timeA;
                });
                
                setReaders(readByData);

            } else {
                console.error(`Notifica con ID ${notifica.id} non trovata!`);
                setReaders([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Errore nel listener del dettaglio notifica:", error);
            setLoading(false);
        });

        return () => {
            unsubscribe();
        }

    }, [notifica, open]);

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'Data non disponibile';
        const date = timestamp.toDate ? timestamp.toDate() : timestamp;
        return new Intl.DateTimeFormat('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(date);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Dettagli Notifica
                {!loading && readers.length > 0 && (
                    <Chip 
                        icon={<PeopleIcon />} 
                        label={`Letto da ${readers.length} tecnici`} 
                        color="success" 
                    />
                )}
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
                ) : (
                    <>
                        {notifica && (
                             <Box mb={2}>
                                <Typography variant="h6" gutterBottom>{notifica.title}</Typography>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{notifica.body}</Typography>
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                    Inviata il: {formatTimestamp(notifica.createdAt)}
                                </Typography>
                             </Box>
                        )}
                        <Divider sx={{ my: 2 }}/>
                        <Typography variant="h6" gutterBottom>Elenco Letture</Typography>
                        {readers.length > 0 ? (
                            <List dense>
                                {readers.map((reader) => (
                                    <ListItem key={reader.uid}>
                                        <ListItemIcon>
                                             <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
                                                {reader.nome?.charAt(0) || 'N'}
                                             </Avatar>
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={reader.nome || 'Nome non disponibile'} 
                                            secondary={`Letto il: ${formatTimestamp(reader.readAt)}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Nessuna lettura registrata.</Typography>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Chiudi</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DettaglioNotificaDialog;
