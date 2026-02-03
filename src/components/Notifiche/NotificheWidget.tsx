import { Box, Typography, List, ListItem, ListItemText, Badge } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications } from '@/contexts/NotificationContext';
import StyledCard from '../StyledCard';

const NotificheWidget = () => {
    const notificheCtx = useNotifications();

    if (!notificheCtx || notificheCtx.loading) {
        return null; // O un componente di caricamento
    }

    const { notifications } = notificheCtx;

    // Ordino per data per avere le più recenti prima.
    const sortedNotifiche = [...notifications].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    // Mostro un numero ragionevole di notifiche
    const visibleNotifiche = sortedNotifiche.slice(0, 5);

    return (
        <StyledCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1 }}>
                <Badge badgeContent={notifications.length} color="error">
                    <NotificationsIcon />
                </Badge>
                <Typography variant="h6" sx={{ ml: 2 }}>
                    Notifiche
                </Typography>
            </Box>
            
            <List dense sx={{ overflow: 'auto', p: 2, pt: 0 }}>
                {visibleNotifiche.length > 0 ? (
                    visibleNotifiche.map(notifica => (
                        <ListItem key={notifica.id} sx={{ p: 0 }}>
                            <ListItemText 
                                primary={notifica.messaggio}
                                secondary={`Data: ${new Date(notifica.data).toLocaleDateString()}`}
                            />
                        </ListItem>
                    ))
                ) : (
                    <Typography sx={{ textAlign: 'center', mt: 2 }}>Nessuna notifica recente.</Typography>
                )}
            </List>
        </StyledCard>
    );
};

export default NotificheWidget;
