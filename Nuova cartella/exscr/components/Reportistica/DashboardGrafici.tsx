import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import MonthlyHoursChart from './MonthlyHoursChart';

const DashboardGrafici: React.FC = () => {
  return (
    <Box sx={{ width: '100%', height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>
        Riepilogo Ore Mensili
      </Typography>
      <Paper sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <MonthlyHoursChart />
      </Paper>
    </Box>
  );
};

export default DashboardGrafici;
