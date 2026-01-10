import { Typography, Box, Grid } from '@mui/material';
import StyledCard from '@/components/StyledCard';
import ScadenzeWidget from '@/components/Scadenze/ScadenzeWidget';
import NotificheWidget from '@/components/Notifiche/NotificheWidget';
import RapportiniChartWidget from '@/components/Rapportini/RapportiniChartWidget';
import AssenzeWidget from '@/components/Presenze/AssenzeWidget'; // Importa il nuovo widget

const Dashboard = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Prima Card: Grafico Rapportini Settimanali */}
        <Grid item xs={12} sm={6} md={3} sx={{ height: '400px' }}>
          <RapportiniChartWidget />
        </Grid>

        {/* Seconda Card: Assenze di Oggi */}
        <Grid item xs={12} sm={6} md={3} sx={{ height: '400px' }}>
          <AssenzeWidget />
        </Grid>

        {/* Altre Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <Typography variant="h6" align="center">3</Typography>
          </StyledCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <Typography variant="h6" align="center">4</Typography>
          </StyledCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ScadenzeWidget />
        </Grid>
        <Grid item xs={12} md={6}>
          <NotificheWidget />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
