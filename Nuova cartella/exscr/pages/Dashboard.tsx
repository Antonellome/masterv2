import { Box, Typography, Paper } from '@mui/material';
import ScadenzeGrid from '@/components/Dashboard/ScadenzeGrid';

const Dashboard = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom component="h1">
                Scadenze Globali
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 3 }}>
                Una vista unificata di tutte le scadenze dei veicoli e dei documenti.
            </Typography>
            <Paper elevation={3} sx={{ p: 2 }}>
                <ScadenzeGrid />
            </Paper>
        </Box>
    );
}

export default Dashboard;
