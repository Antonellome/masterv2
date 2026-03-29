import { useState } from 'react';
import { Tab, Tabs, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import BackupIcon from '@mui/icons-material/Backup';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ThemeIcon from '@mui/icons-material/InvertColors';

import GestioneUtentiTab from '@/components/Settings/GestioneUtentiTab';
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
    <Box sx={{ p: 4, width: '100%' }}>
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        aria-label="impostazioni tabs" 
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab icon={<SettingsIcon />} label="Generali" />
        <Tab icon={<PeopleIcon />} label="Utenti" />
        <Tab icon={<BackupIcon />} label="Backup" />
        <Tab icon={<ScheduleIcon />} label="Orari" />
        <Tab icon={<ThemeIcon />} label="Tema" />
      </Tabs>

      <Box sx={{ pt: 2 }}>
        {tabValue === 0 && <GeneralSettingsTab />}
        {tabValue === 1 && <GestioneUtentiTab />}
        {tabValue === 2 && <BackupTab />}
        {tabValue === 3 && <OrariTab />}
        {tabValue === 4 && <ThemeTab />}
      </Box>

    </Box>
  );
};

export default SettingsPage;
