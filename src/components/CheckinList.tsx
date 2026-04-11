
import React from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip,
    CircularProgress,
    Alert,
    Collapse
} from '@mui/material';
import { CheckinData } from '@/models/definitions';

interface CheckinListProps {
    aggregatedCheckins: Map<string, CheckinData[]>;
    loading: boolean;
    error: string | null;
}

const CheckinList: React.FC<CheckinListProps> = ({ aggregatedCheckins, loading, error }) => {
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (aggregatedCheckins.size === 0) {
        return (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', p: 4 }}>
                Nessun check-in da visualizzare per i filtri selezionati.
            </Typography>
        );
    }

    return (
        <List>
            {Array.from(aggregatedCheckins.entries()).map(([anagraficaId, checkins], index) => {
                const anagraficaNome = checkins[0]?.anagrafica?.nome || 'N/D';
                return (
                    <React.Fragment key={anagraficaId}>
                        <Paper sx={{ mb: 2, p: 2 }} variant="outlined">
                            <Typography variant="h6" gutterBottom>{anagraficaNome} <Chip label={`${checkins.length} tecnici`} size="small" /></Typography>
                            <Collapse in={true} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {checkins.map(checkin => (
                                        <ListItem key={checkin.id} sx={{ pl: 4 }}>
                                            <ListItemText 
                                                primary={checkin.tecnico?.nome || 'Tecnico non trovato'} 
                                                secondary={`Check-in alle: ${checkin.data.toDate().toLocaleTimeString('it-IT')}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        </Paper>
                        {index < aggregatedCheckins.size - 1 && <Divider sx={{mb: 2}}/>}
                    </React.Fragment>
                )
            })}
        </List>
    );
};

export default CheckinList;
