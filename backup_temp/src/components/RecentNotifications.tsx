import { Typography, Box, List, ListItem, ListItemText, Button, Badge } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications.tsx';
import StyledCard from './StyledCard';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const RecentNotifications = () => {
    const { notifications, unreadCount } = useNotifications();
    const navigate = useNavigate();

    const displayedNotifications = (notifications || []).slice(0, 5);

    return (
        <StyledCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <NotificationsActiveIcon sx={{ mr: 1.5, fontSize: 32 }} />
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold' }}>
                        Notifiche Recenti
                    </Typography>
                </Box>
                <Badge badgeContent={unreadCount} color="error" />
            </Box>

            <Box sx={{ flexGrow: 1 }}>
                {displayedNotifications.length > 0 ? (
                    <List disablePadding>
                        {displayedNotifications.map((notification) => (
                            <ListItem key={notification.id} disablePadding sx={{ mb: 1 }}>
                                <ListItemText 
                                    primary={notification.title} 
                                    secondary={new Date(notification.timestamp).toLocaleDateString()} 
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" sx={{ textAlign: 'center', p: 2, color: 'text.secondary' }}>
                        Nessuna notifica recente.
                    </Typography>
                )}
            </Box>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button onClick={() => navigate('/notifications')} size="small">
                    Mostra tutte
                </Button>
            </Box>
        </StyledCard>
    );
};

export default RecentNotifications;
