
import { Box, Typography, Paper } from '@mui/material';
import ScadenzeGrid from '@/components/Dashboard/ScadenzeGrid';

const ScadenzePage = () => {
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Scadenze Globali
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary' }}>
                Monitoraggio di tutte le scadenze relative a veicoli e personale.
            </Typography>
            <Paper elevation={3} sx={{ p: { xs: 1, sm: 2 } }}>
                <ScadenzeGrid />
            </Paper>
        </Box>
    );
};

export default ScadenzePage;
