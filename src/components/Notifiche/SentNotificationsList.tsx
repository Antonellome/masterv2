
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
    ListItemButton,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Tooltip,
    Chip
} from '@mui/material';
import { Delete as DeleteIcon, Done as DoneIcon, DoneAll as DoneAllIcon, People as PeopleIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { collection, query, doc, deleteDoc, Timestamp, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs from 'dayjs';
import { markNotificationAsReadOnServer } from '@/utils/notificationService';

interface NotificaInviata {
  id: string;
  title: string;
  body: string; 
  sentAt: Timestamp; 
  readBy?: { [key: string]: { nome: string, readAt: Timestamp } };
  status?: 'sent' | 'read';
  fcmMessageId: string;
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

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'notificheInviate'), orderBy('sentAt', 'desc'));
        
        const unsubscribe: Unsubscribe = onSnapshot(q, (querySnapshot) => {
            const notifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificaInviata));
            
            // ++ AZIONE CORRETTIVA ++
            // Assicura che la lista sia sempre ordinata lato client, per gestire ogni tipo di aggiornamento da Firestore.
            notifications.sort((a, b) => (b.sentAt?.toDate()?.getTime() || 0) - (a.sentAt?.toDate()?.getTime() || 0));

            setSentNotifications(notifications);
            setLoading(false);
        }, (error) => {
            console.error("Errore nello snapshot dello storico notifiche:", error);
            setSnackbar({ open: true, message: 'Impossibile caricare le notifiche in tempo reale.', severity: 'error' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleOpenDetail = (notifica: NotificaInviata) => {
        if (notifica.status !== 'read' && notifica.id) {
             console.log(`Frontend: L'utente ha aperto la notifica ${notifica.id}. Inoltro al server.`);
             markNotificationAsReadOnServer(notifica.id);
        }
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
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                setSnackbar({ open: true, message: "Errore durante l'eliminazione", severity: 'error' });
            }
        }
        setConfirmDelete({ open: false, id: null });
    };
    
    const generateTooltipContent = (readersMap?: NotificaInviata['readBy']): React.ReactNode => {
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

    const isNotificationRead = (notifica: NotificaInviata): boolean => {
        return notifica.status === 'read' || (notifica.readBy && Object.keys(notifica.readBy).length > 0);
    }

    return (
        <>
            <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
                        Storico Notifiche Inviate
                    </Typography>
                    <Tooltip title="La lista si aggiorna automaticamente!">
                        <span>
                            <IconButton disabled>
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
                            const hasBeenReadByAnyone = isNotificationRead(notifica);
                            const readerCount = notifica.readBy ? Object.keys(notifica.readBy).length : 0;
                            
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
                                                    <Avatar sx={{ bgcolor: hasBeenReadByAnyone ? 'success.main' : 'grey.500' }}>
                                                        {hasBeenReadByAnyone ? <DoneAllIcon /> : <DoneIcon />}
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
                                                        {readerCount > 0 && (
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
                                                primaryTypographyProps={{ 
                                                    variant: 'h6', 
                                                    noWrap: true, 
                                                    sx: { mb: 0.5, fontWeight: hasBeenReadByAnyone ? 'normal' : 'bold' } 
                                                }}
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
