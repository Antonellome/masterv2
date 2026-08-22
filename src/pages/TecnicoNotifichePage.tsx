
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, CircularProgress, Alert, Paper, IconButton, Divider, Tooltip } from '@mui/material';
import { Refresh as RefreshIcon, VisibilityOff as HideIcon, Restore as RestoreIcon } from '@mui/icons-material';
import { getNotifiche, markNotificheAsRead } from '@/services/notificationService';
import { Notifica } from '@/models/definitions';
import SectionLayout from '@/components/common/SectionLayout';

const HIDDEN_NOTIFICATIONS_KEY = 'hidden_notifications';

const TecnicoNotifichePage = () => {
    const [allNotifiche, setAllNotifiche] = useState<Notifica[]>([]);
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);
    const [showHidden, setShowHidden] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load hidden IDs from localStorage on initial render
    useEffect(() => {
        const storedIds = localStorage.getItem(HIDDEN_NOTIFICATIONS_KEY);
        if (storedIds) {
            setHiddenIds(JSON.parse(storedIds));
        }
    }, []);

    const fetchNotifiche = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedNotifiche = await getNotifiche();
            setAllNotifiche(fetchedNotifiche);
        } catch (err) {
            setError('Impossibile caricare le notifiche. Riprova più tardi.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifiche();
    }, [fetchNotifiche]);

    // Mark notifications as read
    useEffect(() => {
        const unreadIds = allNotifiche.filter(n => !n.read && !hiddenIds.includes(n.id)).map(n => n.id);
        if (unreadIds.length > 0) {
            markNotificheAsRead(unreadIds).catch(console.error);
        }
    }, [allNotifiche, hiddenIds]);

    const handleHide = (id: string) => {
        const newHiddenIds = [...hiddenIds, id];
        setHiddenIds(newHiddenIds);
        localStorage.setItem(HIDDEN_NOTIFICATIONS_KEY, JSON.stringify(newHiddenIds));
    };

    const handleRestore = (id: string) => {
        const newHiddenIds = hiddenIds.filter(hiddenId => hiddenId !== id);
        setHiddenIds(newHiddenIds);
        localStorage.setItem(HIDDEN_NOTIFICATIONS_KEY, JSON.stringify(newHiddenIds));
    };

    const visibleNotifiche = useMemo(() => {
        return allNotifiche.filter(n => !hiddenIds.includes(n.id));
    }, [allNotifiche, hiddenIds]);

    const hiddenNotifiche = useMemo(() => {
        return allNotifiche.filter(n => hiddenIds.includes(n.id));
    }, [allNotifiche, hiddenIds]);
    
    const listToDisplay = showHidden ? hiddenNotifiche : visibleNotifiche;

    return (
        <SectionLayout>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
                    <div>
                        <Typography variant="h4" component="h1">Centro Notifiche</Typography>
                        <Typography color="text.secondary">{showHidden ? 'Visualizzi le notifiche nascoste' : 'Tutte le comunicazioni ricevute'}</Typography>
                    </div>
                    <Tooltip title="Ricarica notifiche">
                        <IconButton onClick={fetchNotifiche} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Divider />
                
                 <Box sx={{py: 1, px: 2}}>
                    <Button onClick={() => setShowHidden(!showHidden)} size="small">
                        {showHidden ? 'Torna alle notifiche principali' : `Vedi ${hiddenIds.length} notifiche nascoste`}
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : error ? (
                    <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
                ) : listToDisplay.length === 0 ? (
                    <Alert severity="info" sx={{ m: 2 }}>{showHidden ? 'Nessuna notifica nascosta.' : 'Non ci sono nuove notifiche.'}</Alert>
                ) : (
                    <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        {listToDisplay.map(notifica => (
                            <ListItem
                                key={notifica.id}
                                sx={{ 
                                    bgcolor: notifica.read ? 'transparent' : 'action.hover',
                                    borderLeft: 5,
                                    borderColor: notifica.read ? 'transparent' : 'primary.main'
                                }}
                                secondaryAction={
                                    showHidden ? (
                                        <Tooltip title="Ripristina Notifica">
                                            <IconButton edge="end" onClick={() => handleRestore(notifica.id)}><RestoreIcon /></IconButton>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title="Nascondi Notifica">
                                            <IconButton edge="end" onClick={() => handleHide(notifica.id)}><HideIcon /></IconButton>
                                        </Tooltip>
                                    )
                                }
                            >
                                <ListItemText
                                    primary={notifica.title}
                                    secondary={notifica.body}
                                    primaryTypographyProps={{ fontWeight: notifica.read ? 'normal' : 'bold' }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 2, minWidth: '80px' }}>
                                    {new Date(notifica.createdAt.seconds * 1000).toLocaleDateString()}
                                </Typography>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>
        </SectionLayout>
    );
};

export default TecnicoNotifichePage;
