
import { useState } from 'react';
import { Tab, Tabs, Box, Paper } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import BackupIcon from '@mui/icons-material/Backup';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ThemeIcon from '@mui/icons-material/InvertColors';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

import GestioneAmministratori from '@/components/Settings/GestioneAmministratori';
import GeneralSettingsTab from '@/components/Settings/GeneralSettingsTab';
import BackupTab from '@/components/Settings/BackupTab';
import OrariTab from '@/components/Settings/OrariTab';
import ThemeTab from '@/components/Settings/ThemeTab';

const SettingsPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Paper sx={{ p: 3, m: 2, borderRadius: 2, boxShadow: 3 }}>
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        aria-label="impostazioni tabs" 
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<SettingsIcon />} label="Generali" />
        <Tab icon={<VpnKeyIcon />} label="Amministratori" />
        <Tab icon={<BackupIcon />} label="Backup" />
        <Tab icon={<ScheduleIcon />} label="Orari" />
        <Tab icon={<ThemeIcon />} label="Tema" />
      </Tabs>

      <Box sx={{ pt: 2, minHeight: 400 }}>
        {tabValue === 0 && <GeneralSettingsTab />}
        {tabValue === 1 && <GestioneAmministratori />}
        {tabValue === 2 && <BackupTab />}
        {tabValue === 3 && <OrariTab />}
        {tabValue === 4 && <ThemeTab />}
      </Box>

    </Paper>
  );
};

export default SettingsPage;
