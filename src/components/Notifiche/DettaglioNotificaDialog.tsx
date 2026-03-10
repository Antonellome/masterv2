import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, Avatar, List, ListItem, ListItemAvatar, ListItemText, Divider
} from '@mui/material';
import { Person as PersonIcon, Category as CategoryIcon, Group as GroupIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { NotificaRichiesta } from '../../types/definitions';
import { Timestamp } from 'firebase/firestore';

interface DettaglioNotificaDialogProps {
    open: boolean;
    onClose: () => void;
    notifica: NotificaRichiesta | null;
}

const DettaglioNotificaDialog: React.FC<DettaglioNotificaDialogProps> = ({ open, onClose, notifica }) => {

    const renderDestinatari = () => {
        if (!notifica) return null;

        if (notifica.sendToAll) {
            return (
                <ListItem disableGutters>
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar sx={{ width: 32, height: 32 }}><GroupIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Tutti i tecnici" />
                </ListItem>
            );
        }

        const tecnici = notifica.to_names || [];
        const categorie = notifica.to_category_names || [];

        if (tecnici.length === 0 && categorie.length === 0) {
            return <Typography variant="body2" color="text.secondary">Nessun destinatario specifico.</Typography>;
        }

        return (
            <List dense sx={{ p: 0 }}>
                {tecnici.map((nome, index) => (
                    <ListItem key={`t-${index}`} disableGutters>
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{ width: 32, height: 32 }}><PersonIcon /></Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={nome} />
                    </ListItem>
                ))}
                {categorie.map((nome, index) => (
                    <ListItem key={`c-${index}`} disableGutters>
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{ width: 32, height: 32 }}><CategoryIcon /></Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={nome} />
                    </ListItem>
                ))}
            </List>
        );
    };

    if (!notifica) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ pb: 1 }}>{notifica.title || '(Nessun titolo)'}</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>Destinatari</Typography>
                    {renderDestinatari()}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Messaggio</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{notifica.body}</Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                    <Typography variant="caption" color="text.secondary">Data Invio</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>{dayjs((notifica.createdAt as Timestamp).toDate()).format('DD/MM/YYYY [alle] HH:mm')}</Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Chiudi</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DettaglioNotificaDialog;
