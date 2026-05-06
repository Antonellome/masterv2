
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
import { Delete as DeleteIcon, Done as DoneIcon, DoneAll as DoneAllIcon, People as PeopleIcon } from '@mui/icons-material';
import { collection, onSnapshot, query, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs from 'dayjs';

// La definizione del tipo ora corrisponde a NotificaRichiesta
interface NotificaRichiesta {
  id: string;
  title: string;
  message: string;
  createdAt: Timestamp;
  readBy?: { [key: string]: { nome: string, readAt: Timestamp } };
  // Aggiungiamo anche gli altri campi opzionali per completezza
  to_ids?: string[];
  target?: 'all';
  to_category_ids?: string[];
}

const DettaglioNotificaDialog = lazy(() => import('./DettaglioNotificaDialog'));

const SentNotificationsList = () => {
    const [sentNotifications, setSentNotifications] = useState<NotificaRichiesta[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotifica, setSelectedNotifica] = useState<NotificaRichiesta | null>(null);
    const [isDetailOpen, setDetailOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        // 1. Puntiamo alla collezione corretta: `notificheRichieste`
        const q = query(collection(db, 'notificheRichieste'));
        
        const unsubscribe = onSnapshot(q, snapshot => {
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificaRichiesta));
            
            // 2. Ordiniamo per il campo corretto: `createdAt`
            notifications.sort((a, b) => {
                const dateA = a.createdAt?.toDate()?.getTime() || 0;
                const dateB = b.createdAt?.toDate()?.getTime() || 0;
                return dateB - dateA; // Ordine decrescente per avere le più recenti in alto
            });

            setSentNotifications(notifications);
            setLoading(false);
        }, error => {
            console.error("Errore nel listener dello storico notifiche R.I.S.O.:", error);
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
                // 3. Assicuriamoci di cancellare dalla collezione corretta
                await deleteDoc(doc(db, 'notificheRichieste', confirmDelete.id));
                setSnackbar({ open: true, message: 'Richiesta di notifica eliminata dallo storico', severity: 'info' });
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                setSnackbar({ open: true, message: 'Errore durante l\'eliminazione', severity: 'error' });
            }
        }
        setConfirmDelete({ open: false, id: null });
    };
    
    // Questa funzione è già compatibile con la nuova struttura `readBy`
    const generateTooltipContent = (readersMap: NotificaRichiesta['readBy']): React.ReactNode => {
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

    // ... il resto del componente (UI) rimane invariato, ma aggiorniamo i campi

    if (loading) {
        return <Box display="flex" justifyContent="center" p={4}><CircularProgress />;</Box>;
    }
    if (sentNotifications.length === 0) {
        return (
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Nessuna richiesta di notifica presente nello storico.</Typography>
            </Paper>
        );
    }

    return (
        <>
            <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                                                    {hasBeenRead ? <DoneAllIcon /> : <DoneIcon />}
                                                </Avatar>
                                            </Tooltip>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={notifica.title || '(Nessun titolo)'}
                                            secondary={
                                                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                                                    <Typography component="span" variant="body2" color="text.secondary">
                                                        {`Inviata il: ${dayjs(notifica.createdAt?.toDate()).format('DD/MM/YYYY HH:mm')}`}
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
            </Paper>

            {/* Il dialogo di dettaglio e di conferma eliminazione rimangono funzionalmente invariati */}
            <Suspense fallback={<CircularProgress />}>
                {isDetailOpen && (
                    <DettaglioNotificaDialog
                        open={isDetailOpen}
                        onClose={handleCloseDetail}
                        notifica={selectedNotifica as any} // Cast per compatibilità temporanea, idealmente DettaglioNotificaDialog andrebbe tipizzato
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
                        Sei sicuro di voler eliminare questa richiesta di notifica? L'azione è irreversibile.
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
