// CIAO. Scrivo il codice corretto per risolvere l'errore di compilazione.

import React from 'react';
import {
    List,
    ListItem,
    ListItemText,
    Typography,
    CircularProgress,
    Box,
    Paper,
    IconButton,
    Tooltip,
    Divider
} from '@mui/material';
import MarkAsReadIcon from '@mui/icons-material/MarkEmailRead';
import { useNotifications } from '@/contexts/NotificationProvider';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const ReceivedNotificationsList = () => {
    const { notifications, loading } = useNotifications();

    const handleMarkAsRead = async (notificationId: string) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user || !notificationId) return;

        const db = getFirestore();
        const notificationRef = doc(db, "notifications", notificationId);

        try {
            // CIAO. Aggiorno il documento in Firestore per segnare la notifica come letta.
            await updateDoc(notificationRef, {
                status: "read",
                readAt: serverTimestamp(),
                readBy: user.uid,
            });
        } catch (error) {
            console.error("[CLIENT-DIRETTO] Errore durante l'aggiornamento della notifica:", error);
        }
    };

    if (loading) {
        return <CircularProgress />;
    }

    if (notifications.length === 0) {
        return (
            <Paper elevation={0} sx={{ p: 3, textAlign: 'center', backgroundColor: 'transparent' }}>
                <Typography variant="h6">Nessuna notifica</Typography>
                <Typography color="text.secondary">Non ci sono nuove notifiche da mostrarti.</Typography>
            </Paper>
        );
    }

    return (
        <List sx={{ p: 0 }}>
            {notifications.map((notif, index) => (
                <React.Fragment key={notif.id}>
                    <Paper 
                        component={ListItem}
                        sx={{ 
                            my: 1, 
                            transition: 'box-shadow 0.3s',
                            borderLeft: notif.read ? '4px solid transparent' : '4px solid',
                            borderLeftColor: 'primary.main',
                            '&:hover': { boxShadow: 3 }
                        }}
                    >
                        <ListItemText
                            primary={<Typography variant="subtitle1" fontWeight={notif.read ? 'normal' : 'bold'}>{notif.title}</Typography>}
                            secondary={
                                <>
                                    <Typography component="span" variant="body2" color="text.primary" sx={{ display: 'block', my: 1 }}>
                                        {notif.message}
                                    </Typography>
                                    <Typography component="span" variant="caption" color="text.secondary">
                                        {notif.createdAt?.toDate ? 
                                            formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: it })
                                            : 'Poco fa'}
                                    </Typography>
                                </>
                            }
                        />
                        {!notif.read && (
                            <Box sx={{ alignSelf: 'center', ml: 2 }}>
                                <Tooltip title="Segna come letto">
                                    <IconButton edge="end" aria-label="mark as read" onClick={() => handleMarkAsRead(notif.id)}>
                                        <MarkAsReadIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </Paper>
                    {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
            ))}
        </List>
    );
};

export default ReceivedNotificationsList;
