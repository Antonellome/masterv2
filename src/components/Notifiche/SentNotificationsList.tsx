import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
    Typography,
    Box,
    CircularProgress,
    Paper,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
    Snackbar,
    Alert,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider
} from '@mui/material';
import { Delete as DeleteIcon, Notifications as NotificationsIcon } from '@mui/icons-material';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import dayjs from 'dayjs';
import type { NotificaRichiesta } from '../../types/definitions';

const DettaglioNotificaDialog = lazy(() => import('./DettaglioNotificaDialog'));

const SentNotificationsList = () => {
    const [sentNotifications, setSentNotifications] = useState<NotificaRichiesta[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotifica, setSelectedNotifica] = useState<NotificaRichiesta | null>(null);
    const [isDetailOpen, setDetailOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        const q = query(collection(db, 'notificheRichieste'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificaRichiesta));
            setSentNotifications(notifications);
            setLoading(false);
        }, error => {
            console.error("Errore nel listener delle notifiche inviate:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenDetail = (notifica: NotificaRichiesta) => {
        setSelectedNotifica(notifica);
        setDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setDetailOpen(false);
        setSelectedNotifica(null);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); 
        setConfirmDelete({ open: true, id });
    };

    const handleConfirmDelete = async () => {
        if (confirmDelete.id) {
            try {
                await deleteDoc(doc(db, 'notificheRichieste', confirmDelete.id));
                setSnackbar({ open: true, message: 'Notifica eliminata con successo', severity: 'info' });
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                setSnackbar({ open: true, message: 'Errore durante l\'eliminazione', severity: 'error' });
            }
        }
        setConfirmDelete({ open: false, id: null });
    };

    const renderRecipientsText = (notifica: NotificaRichiesta): string => {
        if (notifica.sendToAll) {
            return 'Tutti i tecnici';
        }

        // CORREZIONE: Leggo dai campi _names per la visualizzazione
        const toNames = notifica.to_names || [];
        const toCategoryNames = notifica.to_category_names || [];
        
        const recipients = [
            ...toNames,
            ...toCategoryNames.map(c => `Cat: ${c}`)
        ];

        if (recipients.length === 0) {
            return 'Destinatari non specificati';
        }

        return recipients.join(', ');
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    }
    if (sentNotifications.length === 0) {
        return (
             <Box sx={{ p: { xs: 0.5, sm: 1 } }}>
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center', mt: 2 }}>
                    <Typography color="text.secondary">Nessuna notifica inviata.</Typography>
                </Paper>
            </Box>
        );
    }

    return (
        <>
            <Paper elevation={3} sx={{ mt: 2 }}>
                <List sx={{ padding: 0 }}>
                    {sentNotifications.map((notifica, index) => (
                        <React.Fragment key={notifica.id}>
                            <ListItem
                                secondaryAction={
                                    <IconButton edge="end" aria-label="delete" onClick={(e) => handleDeleteClick(e, notifica.id!)}>
                                        <DeleteIcon />
                                    </IconButton>
                                }
                                button
                                onClick={() => handleOpenDetail(notifica)}
                            >
                                <ListItemAvatar>
                                    <Avatar>
                                        <NotificationsIcon />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={notifica.title || '(Nessun titolo)'}
                                    secondary={
                                        <Box component="span" sx={{ display: 'block' }}>
                                            <Typography component="span" variant="body2" color="text.primary" sx={{ fontWeight: 'bold' }}>
                                                {renderRecipientsText(notifica)}
                                            </Typography>
                                            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                                                {`Inviata il: ${dayjs((notifica.createdAt as Timestamp).toDate()).format('DD/MM/YYYY HH:mm')}`}
                                            </Typography>
                                        </Box>
                                    }
                                    primaryTypographyProps={{ variant: 'h6', noWrap: true, sx: { mb: 0.5 } }}
                                />
                            </ListItem>
                            {index < sentNotifications.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>

            <Suspense fallback={<CircularProgress />}>
                {isDetailOpen && (
                    <DettaglioNotificaDialog
                        open={isDetailOpen}
                        onClose={handleCloseDetail}
                        notifica={selectedNotifica}
                    />
                )}
            </Suspense>

             <Dialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
            >
                <DialogTitle>Conferma Eliminazione</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Sei sicuro di voler eliminare questa notifica? L'azione è irreversibile.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete({ open: false, id: null })}>Annulla</Button>
                    <Button onClick={handleConfirmDelete} color="error">Elimina</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default SentNotificationsList;
