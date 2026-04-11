
import React from 'react';
import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShipIcon from '@mui/icons-material/DirectionsBoat';
import PlaceIcon from '@mui/icons-material/Place';
import PersonIcon from '@mui/icons-material/Person';
import { CheckinData, Tecnico } from '@/models/definitions';

interface CheckinVisivoProps {
    checkins: CheckinData[] | null;
    loading: boolean;
    error: string | null;
}

interface AggregatedData {
    [key: string]: Tecnico[];
}

const CheckinVisivo: React.FC<CheckinVisivoProps> = ({ checkins, loading, error }) => {

    const { navi, luoghi } = React.useMemo(() => {
        if (!checkins) {
            return { navi: {}, luoghi: {} };
        }
        const naviMap: AggregatedData = {};
        const luoghiMap: AggregatedData = {};

        for (const checkin of checkins) {
            if (checkin.anagrafica && checkin.tecnico) {
                const anagraficaNome = checkin.anagrafica.nome;
                const targetMap = checkin.anagrafica.tipo === 'nave' ? naviMap : luoghiMap;
                if (!targetMap[anagraficaNome]) targetMap[anagraficaNome] = [];
                targetMap[anagraficaNome].push(checkin.tecnico);
            }
        }
        
        Object.values(naviMap).forEach(tecnici => tecnici.sort((a, b) => a.nome.localeCompare(b.nome)));
        Object.values(luoghiMap).forEach(tecnici => tecnici.sort((a, b) => a.nome.localeCompare(b.nome)));

        return { navi: naviMap, luoghi: luoghiMap };
    }, [checkins]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    }

    if (error) return null;

    const naviEntries = Object.entries(navi);
    const luoghiEntries = Object.entries(luoghi);

    if (naviEntries.length === 0 && luoghiEntries.length === 0) {
        return (
             <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }} variant="outlined">
                <Typography color="text.secondary">Nessun check-in trovato per i filtri selezionati.</Typography>
            </Paper>
        );
    }

    const renderGroup = (title: string, icon: React.ReactElement, entries: [string, Tecnico[]][]) => (
        <Paper sx={{ p: 2, height: '100%' }} variant="outlined">
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {icon} {title}
            </Typography>
            <Box sx={{ maxHeight: '70vh', overflowY: 'auto', pr: 1, '::-webkit-scrollbar': { width: '8px' }, '::-webkit-scrollbar-thumb': { backgroundColor: '#ccc', borderRadius: '4px' } }}>
                {entries.length === 0 ? (
                    <Typography sx={{textAlign: 'center', mt: 2, color: 'text.secondary'}}>Nessuna presenza.</Typography>
                ) : (
                     entries.sort((a,b) => b[1].length - a[1].length).map(([nome, tecnici]) => (
                        <Accordion key={nome} sx={{ my: 0.5}} elevation={1}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                 <Typography sx={{ flexGrow: 1, fontWeight: '500' }}>{nome}</Typography>
                                 <Chip icon={<PersonIcon />} label={tecnici.length} size="small" color="primary" variant="filled"/>
                            </AccordionSummary>
                            <AccordionDetails sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: '200px', overflowY: 'auto' }}>
                                {tecnici.map((tecnico) => (
                                    <Chip key={tecnico.id} label={tecnico.nome} variant="outlined" size="small"/>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    ))
                )}
            </Box>
        </Paper>
    );

    return (
        <Grid container spacing={2} sx={{ mt: 1 }} alignItems="stretch">
            <Grid item xs={12} md={6}>
                {renderGroup('Navi', <ShipIcon sx={{ mr: 1, color: 'primary.main' }} />, naviEntries)}
            </Grid>
            <Grid item xs={12} md={6}>
                {renderGroup('Luoghi', <PlaceIcon sx={{ mr: 1, color: 'secondary.main' }} />, luoghiEntries)}
            </Grid>
        </Grid>
    );
};

export default CheckinVisivo;
