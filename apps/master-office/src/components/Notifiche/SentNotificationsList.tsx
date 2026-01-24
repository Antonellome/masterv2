import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
    Typography,
    Box,
    ListItemText,
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
    Tooltip
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
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
                setSnackbar({ open: true, message: 'Notifica inviata eliminata con successo', severity: 'info' });
            } catch (error) {
                console.error("Errore durante l'eliminazione della notifica inviata:", error);
                setSnackbar({ open: true, message: 'Errore durante l\'eliminazione', severity: 'error' });
            }
        }
        setConfirmDelete({ open: false, id: null });
    };

    const renderRecipients = (notifica: NotificaRichiesta) => {
        const recipients = [...(notifica.to_names || []), ...(notifica.to_categories || []).map((c: string) => `Cat: ${c}`)];
        if (recipients.length === 0) {
            return <Typography variant="body2" color="text.secondary">Nessun destinatario</Typography>;
        }

        const displayLimit = 3;
        const displayedRecipients = recipients.slice(0, displayLimit);
        const hiddenCount = recipients.length - displayedRecipients.length;

        return (
            <Box>
                {displayedRecipients.map((recipient, index) => (
                    <Typography key={index} variant="body2" sx={{ fontWeight: 'bold', display: 'block' }} noWrap>
                        {recipient}
                    </Typography>
                ))}
                {hiddenCount > 0 && (
                    <Tooltip title={recipients.slice(displayLimit).join(', ')}>
                        <Typography variant="caption" color="text.secondary">
                            + {hiddenCount} altri...
                        </Typography>
                    </Tooltip>
                )}
            </Box>
        );
    };


    if (loading) {
        return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    }
    if (sentNotifications.length === 0) {
        return (
             <Box sx={{ p: { xs: 0.5, sm: 1 } }}>
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Nessuna notifica inviata.</Typography>
                </Paper>
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ p: { xs: 0.5, sm: 1 } }}>
                {sentNotifications.map((notifica) => (
                    <Paper 
                        key={notifica.id} 
                        elevation={3}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 2,
                            mb: 1.5,
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background-color 0.2s ease-in-out',
                            '&:hover': { backgroundColor: 'action.hover' }
                        }}
                        onClick={() => handleOpenDetail(notifica)}
                    >
                        <Box sx={{ flex: '0 0 40%', pr: 2 }}>
                            {renderRecipients(notifica)}
                        </Box>

                        <ListItemText
                            primary={notifica.title}
                            secondary={`Inviata il: ${dayjs((notifica.createdAt as Timestamp).toDate()).format('DD/MM/YYYY HH:mm')}`}
                            sx={{ flex: '1 1 auto', m: 0 }}
                            primaryTypographyProps={{ variant: 'h6' }}
                            secondaryTypographyProps={{ color: 'text.secondary' }}
                        />
                         <IconButton
                            onClick={(e) => handleDeleteClick(e, notifica.id!)}
                            size="small"
                            sx={{ position: 'absolute', top: 8, right: 8, color: 'action.active' }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Paper>
                ))}
            </Box>

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
                        Sei sicuro di voler eliminare questa notifica inviata? L&apos;azione è irreversibile.
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
