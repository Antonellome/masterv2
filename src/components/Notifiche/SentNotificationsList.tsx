
import React, { useState, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, limit, getCountFromServer, where, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Typography,
    Box,
    CircularProgress,
    Alert,
    Divider,
    Chip,
    IconButton,
    Collapse,
    Tooltip,
    List,
    ListItem,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
    Snackbar,
    LinearProgress
} from '@mui/material';
import { format, isValid } from 'date-fns';
import it from 'date-fns/locale/it';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import type { NotificaInviata } from '@/models/definitions';

// Rimuoviamo completamente la chiamata alla Cloud Function. L'eliminazione ora è gestita sul client.

const ReadStatusIcon = ({ notification }: { notification: NotificaInviata }) => {
    const [readCount, setReadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!notification.batchId) {
            setLoading(false);
            return;
        }
        const getReadCount = async () => {
            try {
                const q = query(collection(db, 'notifiche'), where('batchId', '==', notification.batchId), where('isRead', '==', true));
                const snapshot = await getCountFromServer(q);
                setReadCount(snapshot.data().count);
            } catch (error) {
                console.error("Errore nel contare le notifiche lette:", error);
            } finally {
                setLoading(false);
            }
        };
        getReadCount();
    }, [notification.batchId]);

    if (loading) return <CircularProgress size={16} sx={{ color: 'text.disabled' }} />;

    const totalRecipients = notification.recipientsCount || 0;
    if (readCount === totalRecipients && totalRecipients > 0) {
        return <Tooltip title={`Letto da tutti (${readCount}/${totalRecipients})`}><DoneAllIcon sx={{ fontSize: 16, color: 'primary.main' }} /></Tooltip>;
    } else if (readCount > 0) {
        return <Tooltip title={`Letto da ${readCount} su ${totalRecipients}`}><DoneAllIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></Tooltip>;
    } else {
        return <Tooltip title="Inviato, non ancora letto"><CheckIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></Tooltip>;
    }
};

const SentNotificationsList = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState<{ logId: string; batchId?: string } | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const notificationsQuery = query(collection(db, 'notificheInviate'), orderBy('sentAt', 'desc'), limit(100));
    const [notificationsSnapshot, loading, error] = useCollection(notificationsQuery);

    const handleToggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

    const handleOpenDeleteDialog = (logId: string, batchId?: string) => {
        setNotificationToDelete({ logId, batchId });
        setDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        if (isDeleting) return;
        setDialogOpen(false);
        setNotificationToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!notificationToDelete) return;
        setIsDeleting(true);

        const { logId, batchId } = notificationToDelete;

        try {
            // Step 1: Delete the main log document.
            const logDocRef = doc(db, "notificheInviate", logId);
            await deleteDoc(logDocRef);

            // Step 2: If there's a batchId, delete all associated notifications.
            if (batchId) {
                const notificationsQuery = query(collection(db, "notifiche"), where("batchId", "==", batchId));
                const snapshot = await getDocs(notificationsQuery);

                if (!snapshot.empty) {
                    const BATCH_SIZE = 500;
                    let commitCount = 0;
                    let batch = writeBatch(db);
                    
                    snapshot.docs.forEach((doc, index) => {
                        batch.delete(doc.ref);
                        commitCount++;
                        if (commitCount === BATCH_SIZE) {
                            batch.commit();
                            batch = writeBatch(db); // start a new batch
                            commitCount = 0;
                        }
                    });

                    if (commitCount > 0) {
                       await batch.commit();
                    }
                }
            }
            setSnackbar({ open: true, message: 'Notifica eliminata con successo.', severity: 'success' });
        } catch (err: any) {
            console.error("Errore catastrofico durante l'eliminazione lato client:", err);
            setSnackbar({ open: true, message: `Eliminazione fallita: ${err.message}`, severity: 'error' });
        } finally {
            setIsDeleting(false);
            handleCloseDeleteDialog();
        }
    };

    const renderTargetChip = (notification: NotificaInviata) => {
        const { target } = notification;
        if (!target || !target.type) return null;
        const chipProps = { size: "small" as const, variant: "outlined" as const, sx: { ml: 1 } };
        switch (target.type) {
            case 'user': return <Chip label={`👤 ${target.description}`} color="primary" {...chipProps} />;
            case 'categoria': return <Chip label={`🏷️ ${target.description}`} color="secondary" {...chipProps} />;
            case 'tutti': return <Chip label="📢 Tutti" color="warning" {...chipProps} />;
            default: return <Chip label={target.description || "Sconosciuto"} {...chipProps} />;
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 2 }}>Errore: {error.message}</Alert>;
    if (!notificationsSnapshot || notificationsSnapshot.docs.length === 0) return <Alert severity="info" sx={{ m: 2 }}>Nessuna notifica inviata.</Alert>;

    return (
        <>
            <List sx={{ p: 0 }}>
                {notificationsSnapshot.docs.map((doc, index) => {
                    const notification = { id: doc.id, ...doc.data() } as NotificaInviata;
                    const isExpanded = expandedId === doc.id;
                    const createdAtDate = notification.sentAt?.toDate ? notification.sentAt.toDate() : null;
                    const formattedDate = isValid(createdAtDate) ? format(createdAtDate, "PPP 'alle' HH:mm", { locale: it }) : 'Data non disponibile';

                    return (
                        <React.Fragment key={doc.id}>
                            <ListItem sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">{formattedDate}</Typography>
                                        <ReadStatusIcon notification={notification} />
                                    </Box>
                                    <IconButton size="small" onClick={() => handleToggleExpand(doc.id)}>
                                        <ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                    </IconButton>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mt: 0.5 }}>
                                    <Typography variant="body1" component="div" fontWeight="bold">{notification.title}</Typography>
                                    {renderTargetChip(notification)}
                                    <Chip label={`${notification.recipientsCount} destinatari`} size="small" sx={{ ml: 1 }} />
                                </Box>

                                <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={{ width: '100%', mt: 1 }}>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, whiteSpace: 'pre-wrap' }}>
                                        {notification.body}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', pt: 1 }}>
                                        <IconButton size="small" onClick={() => handleOpenDeleteDialog(doc.id, notification.batchId)} disabled={isDeleting}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Collapse>
                            </ListItem>
                            {index < notificationsSnapshot.docs.length - 1 && <Divider />}
                        </React.Fragment>
                    );
                })}
            </List>

            <Dialog open={dialogOpen} onClose={handleCloseDeleteDialog}>
                <DialogTitle>Conferma Eliminazione</DialogTitle>
                {isDeleting && <LinearProgress />}
                <DialogContent>
                    <DialogContentText>
                        Sei sicuro di voler eliminare questa notifica? L'azione è irreversibile e rimuoverà la notifica per tutti i destinatari.
                        {isDeleting && " (Eliminazione in corso...)"}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Annulla</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>
                        Elimina
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
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
