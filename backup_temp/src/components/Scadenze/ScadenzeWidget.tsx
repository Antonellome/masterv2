import { Box, Typography, List, ListItem, ListItemText, Badge } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useScadenze } from '@/hooks/useScadenze';
import StyledCard from '../StyledCard';

const ScadenzeWidget = () => {
    const scadenzeCtx = useScadenze();

    if (!scadenzeCtx) {
        return null;
    }

    // Assicura che 'allScadenze' sia sempre un array.
    const allScadenze = scadenzeCtx.allScadenze || [];

    // Ordino per data per avere le più vicine prima
    const sortedScadenze = [...allScadenze].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    
    // Mostro un numero ragionevole di scadenze
    const visibleScadenze = sortedScadenze.slice(0, 5);

    return (
        <StyledCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1 }}>
                <Badge badgeContent={allScadenze.length} color="error">
                    <NotificationsIcon />
                </Badge>
                <Typography variant="h6" sx={{ ml: 2 }}>
                    Scadenze
                </Typography>
            </Box>
            
            <List dense sx={{ overflow: 'auto', p: 2, pt: 0 }}>
                {visibleScadenze.length > 0 ? (
                    visibleScadenze.map(scadenza => (
                        <ListItem key={scadenza.id} sx={{ p: 0 }}>
                            <ListItemText 
                                primary={scadenza.descrizione}
                                secondary={`Data: ${scadenza.data}`}
                            />
                        </ListItem>
                    ))
                ) : (
                    <Typography sx={{ textAlign: 'center', mt: 2 }}>Nessuna scadenza imminente.</Typography>
                )}
            </List>
        </StyledCard>
    );
};

export default ScadenzeWidget;
