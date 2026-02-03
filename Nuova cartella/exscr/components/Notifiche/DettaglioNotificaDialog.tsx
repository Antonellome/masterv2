import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, CircularProgress, Chip, Avatar, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import { Person as PersonIcon, Category as CategoryIcon } from '@mui/icons-material';
import { collection, getDocs, query, where, documentId, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase'; // <-- Percorso corretto
import dayjs from 'dayjs';
import type { Notifica, Tecnico } from '@/models/definitions'; // <-- Percorso e tipo corretti

interface DettaglioNotificaDialogProps {
    open: boolean;
    onClose: () => void;
    notifica: Notifica | null; // <-- Usiamo il tipo unificato
}

const DettaglioNotificaDialog: React.FC<DettaglioNotificaDialogProps> = ({ open, onClose, notifica }) => {
    const [destinatari, setDestinatari] = useState<Tecnico[]>([]);
    const [loading, setLoading] = useState(false);

    const target = notifica?.target;
    const targetId = notifica?.targetId;

    useEffect(() => {
        const fetchDestinatari = async (ids: string[]) => {
            if (!ids || ids.length === 0) return;
            setLoading(true);
            try {
                const q = query(collection(db, 'tecnici'), where(documentId(), 'in', ids));
                const querySnapshot = await getDocs(q);
                const tecniciList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tecnico));
                setDestinatari(tecniciList);
            } catch (error) {
                console.error("Errore nel recuperare i destinatari: ", error);
                setDestinatari([]);
            }
            setLoading(false);
        };

        if (target === 'tecnici' && targetId) {
            fetchDestinatari([targetId]);
        } else {
            setDestinatari([]);
        }

    }, [target, targetId]);

    const renderDestinatari = useMemo(() => {
        if (loading) return <CircularProgress size={24} />;

        if (target === 'categoria' && targetId) {
            return <Chip icon={<CategoryIcon />} label={targetId} color="primary" variant="filled" />;
        }

        if (destinatari.length > 0) {
            return (
                <List dense sx={{ p: 0 }}>
                    {destinatari.map((t, index) => (
                        <ListItem key={t.id || index} disableGutters>
                            <ListItemAvatar sx={{minWidth: 40}}>
                                <Avatar sx={{ width: 32, height: 32 }}>
                                    <PersonIcon />
                                </Avatar>
                            </ListItemAvatar>
                            {/* Corretto: uso di name e cognome */}
                            <ListItemText primary={`${t.name} ${t.cognome || ''}`} />
                        </ListItem>
                    ))}
                </List>
            );
        }

        if (target === 'all') {
            return <Typography variant="body2" color="text.secondary">A tutti gli utenti</Typography>;
        }

        return <Typography variant="body2" color="text.secondary">Nessun destinatario specifico.</Typography>;
    }, [loading, destinatari, target, targetId]);

    if (!notifica) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ pb: 1 }}>{notifica.title}</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" component="div">Destinatari</Typography>
                    {renderDestinatari}
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Messaggio</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{notifica.body}</Typography>
                </Box>

                <Box>
                    <Typography variant="caption" color="text.secondary">Data Invio</Typography>
                    <Typography variant="body2">{dayjs((notifica.createdAt as Timestamp).toDate()).format('DD/MM/YYYY HH:mm')}</Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Chiudi</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DettaglioNotificaDialog;
