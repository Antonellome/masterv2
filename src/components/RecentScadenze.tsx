import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Divider, Tooltip, IconButton, Badge, keyframes } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { WarningAmber, ErrorOutline, VisibilityOff, Visibility, EventBusy } from '@mui/icons-material';
import { useScadenze } from '@/hooks/useScadenze';
import StyledCard from './StyledCard';
import dayjs from 'dayjs';
import { useState } from 'react';

// Animazione di impulso per scadenze critiche
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
`;

const RecentScadenze = () => {
    const { activeScadenze, loading, activeScadenzeCount, overallStatus } = useScadenze();
    const [showAll, setShowAll] = useState(false);

    // FIX: Assicurati che activeScadenze esista e crea una copia prima di ordinare
    const sortedScadenze = activeScadenze 
        ? [...activeScadenze].sort((a, b) => dayjs(a.data).diff(dayjs(b.data)))
        : [];
    
    const itemsToShow = showAll ? sortedScadenze : sortedScadenze.slice(0, 5);

    const getScadenzeIconStyle = () => {
        switch (overallStatus) {
            case 'scaduto':
                return { animation: `${pulse} 2s infinite`, color: 'red', borderRadius: '50%' };
            case 'imminente':
                return { color: 'yellow' };
            default:
                return { color: 'inherit' };
        }
    };

    return (
        <StyledCard sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Box>
                    <Typography variant="h6" component="h2">Scadenze Recenti</Typography>
                    <Typography variant="body2" color="text.secondary">Le prossime scadenze da monitorare</Typography>
                </Box>
                <Box>
                    <Tooltip title="Scadenze Attive">
                        <Badge badgeContent={activeScadenzeCount} color="error">
                            <EventBusy sx={getScadenzeIconStyle()} />
                        </Badge>
                    </Tooltip>
                </Box>
            </Box>
            <Divider />
            {loading ? (
                <Box sx={{ p: 2 }}><Typography>Caricamento...</Typography></Box>
            ) : itemsToShow.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">Nessuna scadenza attiva.</Typography>
                </Box>
            ) : (
                <List dense sx={{ px: 1 }}>
                    {itemsToShow.map(scadenza => (
                        <ListItem key={scadenza.id} dense>
                            <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: scadenza.status === 'scaduto' ? 'error.main' : 'warning.main' }}>
                                {scadenza.status === 'scaduto' ? <ErrorOutline /> : <WarningAmber />}
                            </ListItemIcon>
                            <ListItemText 
                                primary={scadenza.descrizione}
                                secondary={`Scade il ${dayjs(scadenza.data).format('DD/MM/YYYY')}`}
                                primaryTypographyProps={{ variant: 'body2' }}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
            {(sortedScadenze.length > 5) && (
                <Box sx={{ p: 1, textAlign: 'center' }}>
                     <Tooltip title={showAll ? "Mostra meno" : "Mostra tutto"}>
                        <IconButton onClick={() => setShowAll(!showAll)} size="small">
                           {showAll ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </Tooltip>
                </Box>
            )}
             <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <Typography 
                    component={RouterLink} 
                    to="/scadenze" 
                    variant="body2"
                    sx={{ textDecoration: 'none', color: 'primary.main', fontWeight: 'bold' }}
                >
                    Vai a tutte le scadenze
                </Typography>
            </Box>
        </StyledCard>
    );
};

export default RecentScadenze;
