
import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';

import CheckinSection from '@/components/Presenze/CheckinSection';
import Presenze from '@/components/Presenze';
import CheckinVisivo from '@/components/Checkin/CheckinVisivo';
import { useData } from '@/hooks/useData'; // Import the hook

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`presenze-tabpanel-${index}`}
      aria-labelledby={`presenze-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PresenzePage = () => {
  const [value, setValue] = useState(0);
  const { tecnici, rapportini, checkins, anagrafiche, loading, error } = useData();

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">Errore nel caricamento dei dati: {error.message}</Typography>;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" gutterBottom>Monitoraggio Presenze</Typography>
      <Typography variant="body2" color="text.secondary">
        Sezione per il monitoraggio dei check-in giornalieri e la gestione delle presenze.
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs value={value} onChange={handleChange} aria-label="Tabs monitoraggio presenze">
          <Tab 
            label="Check-in Giornaliero" 
            icon={<CheckCircleOutlineIcon />} 
            iconPosition="start" 
            id="presenze-tab-0" 
            aria-controls="presenze-tabpanel-0" 
          />
          <Tab 
            label="Check-in Visivo"
            icon={<VisibilityIcon />} 
            iconPosition="start" 
            id="presenze-tab-1" 
            aria-controls="presenze-tabpanel-1" 
          />
          <Tab 
            label="Storico Presenze" 
            icon={<PeopleAltIcon />} 
            iconPosition="start" 
            id="presenze-tab-2" 
            aria-controls="presenze-tabpanel-2" 
          />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        {/* Questo componente dovrà essere aggiornato o rimosso se la sua logica è duplicata */}
        <CheckinSection />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CheckinVisivo checkins={checkins} anagrafiche={anagrafiche} tecnici={tecnici} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Presenze tecnici={tecnici} rapportini={rapportini} />
      </TabPanel>
    </Box>
  );
};

export default PresenzePage;
