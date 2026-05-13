
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
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
    ListItemButton,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Tooltip,
    Chip
} from '@mui/material';
import { Delete as DeleteIcon, Done as DoneIcon, DoneAll as DoneAllIcon, People as PeopleIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { collection, query, doc, deleteDoc, Timestamp, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs from 'dayjs';

interface NotificaInviata {
  id: string;
  title: string;
  body: string; 
  sentAt: Timestamp; 
  readBy?: { [key: string]: { nome: string, readAt: Timestamp } };
  fcmMessageId: string;
  status: 'sent';
  to_ids?: string[];
  target?: 'all';
  to_category_ids?: string[];
}

const DettaglioNotificaDialog = lazy(() => import('./DettaglioNotificaDialog'));

const SentNotificationsList = () => {
    const [sentNotifications, setSentNotifications] = useState<NotificaInviata[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotifica, setSelectedNotifica] = useState<NotificaInviata | null>(null);
    const [isDetailOpen, setDetailOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });

    const fetchNotifications = useCallback(async (showSnackbar = false) => {
        setLoading(true);
        try {
            // Ripristinato ordinamento corretto con indice Firestore
            const q = query(collection(db, 'notificheInviate'), orderBy('sentAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const notifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificaInviata));
            
            setSentNotifications(notifications);

            if (showSnackbar) {
                setSnackbar({ open: true, message: 'Lista notifiche aggiornata', severity: 'success' });
            }
        } catch (error) {
            console.error("Errore nel caricamento dello storico notifiche:", error);
            const errorMessage = (error as Error).message;
            if (errorMessage.includes('firestore/failed-precondition')) {
                setSnackbar({ open: true, message: 'Indice Firestore mancante. Controlla la console per il link di creazione.', severity: 'error' });
            } else {
                setSnackbar({ open: true, message: 'Impossibile aggiornare le notifiche.', severity: 'error' });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleOpenDetail = (notifica: NotificaInviata) => {
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
                await deleteDoc(doc(db, 'notificheInviate', confirmDelete.id));
                setSnackbar({ open: true, message: 'Notifica eliminata dallo storico', severity: 'info' });
                fetchNotifications(); // Ricarica la lista dopo l'eliminazione
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                setSnackbar({ open: true, message: "Errore durante l'eliminazione", severity: 'error' });
            }
        }
        setConfirmDelete({ open: false, id: null });
    };
    
    const generateTooltipContent = (readersMap: NotificaInviata['readBy']): React.ReactNode => {
        if (!readersMap) {
            return <Typography variant="caption">Nessuna lettura registrata.</Typography>;
        }
        const readers = Object.values(readersMap);
        if (readers.length === 0) {
            return <Typography variant="caption">Nessuna lettura registrata.</Typography>;
        }
        const sortedReaders = [...readers].sort((a, b) => (b.readAt?.toDate()?.getTime() || 0) - (a.readAt?.toDate()?.getTime() || 0));
        return (
            <Box>
                {sortedReaders.map((reader, index) => (
                    <Typography key={index} variant="caption" display="block">
                        - {reader.nome} (Letto il: {dayjs(reader.readAt?.toDate()).format('DD/MM HH:mm')})
                    </Typography>
                ))}
            </Box>
        );
    };

    return (
        <>
            <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
                        Storico Notifiche Inviate
                    </Typography>
                    <Tooltip title="Aggiorna Lista">
                        <span>
                            <IconButton onClick={() => fetchNotifications(true)} disabled={loading}>
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" sx={{flexGrow: 1}}><CircularProgress /></Box>
                ) : sentNotifications.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" sx={{flexGrow: 1}}>
                        <Typography color="text.secondary">Nessuna notifica inviata nello storico.</Typography>
                    </Box>
                ) : (
                    <List sx={{ overflow: 'auto', p: 0, flexGrow: 1 }}>
                        {sentNotifications.map((notifica, index) => {
                            const readers = notifica.readBy ? Object.values(notifica.readBy) : [];
                            const readerCount = readers.length;
                            const hasBeenRead = readerCount > 0;
                            
                            return (
                                <React.Fragment key={notifica.id}>
                                    <ListItem
                                        disablePadding
                                        secondaryAction={
                                            <IconButton edge="end" aria-label="delete" onClick={(e) => handleDeleteClick(e, notifica.id!)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemButton onClick={() => handleOpenDetail(notifica)}>
                                            <ListItemAvatar>
                                                <Tooltip title={generateTooltipContent(notifica.readBy)} arrow placement="right">
                                                    <Avatar sx={{ bgcolor: hasBeenRead ? 'success.main' : 'grey.500' }}>
                                                        {hasBeenRead ? <DoneAllIcon /> : <DoneIcon />}\
                                                    </Avatar>
                                                </Tooltip>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={notifica.title || '(Nessun titolo)'}
                                                secondary={
                                                    <Box component="span" sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                                                        <Typography component="span" variant="body2" color="text.secondary">
                                                            {`Inviata il: ${dayjs(notifica.sentAt?.toDate()).format('DD/MM/YYYY HH:mm')}`}
                                                        </Typography>
                                                        {hasBeenRead && (
                                                            <Chip 
                                                                icon={<PeopleIcon />}
                                                                label={`Letto da ${readerCount} ${readerCount > 1 ? 'tecnici' : 'tecnico'}`}
                                                                size="small"
                                                                color="success"
                                                                variant="outlined"
                                                                sx={{ mt: 1, maxWidth: 'fit-content' }}
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                                primaryTypographyProps={{ variant: 'h6', noWrap: true, sx: { mb: 0.5 } }}
                                                secondaryTypographyProps={{ component: 'div' }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {index < sentNotifications.length - 1 && <Divider variant="inset" component="li" />}
                                </React.Fragment>
                            );
                        })}
                    </List>
                )}
            </Paper>

            <Suspense fallback={<CircularProgress />}>
                {isDetailOpen && (
                    <DettaglioNotificaDialog
                        open={isDetailOpen}
                        onClose={handleCloseDetail}
                        notifica={selectedNotifica as any}
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
                        Sei sicuro di voler eliminare questa notifica dallo storico? L'azione è irreversibile.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete({ open: false, id: null })}>Annulla</Button>
                    <Button onClick={handleConfirmDelete} color="error">Elimina</Button>
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
