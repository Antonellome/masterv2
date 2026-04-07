
import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GestioneTecnici from '@/components/Tecnici/GestioneTecnici';
import GestioneAccessi from '@/components/Tecnici/GestioneAccessi';

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
      id={`tecnici-tabpanel-${index}`}
      aria-labelledby={`tecnici-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TecniciPage = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" gutterBottom>Gestione Tecnici</Typography>
      <Typography variant="body2" color="text.secondary">
        Sezione per la gestione completa dell'anagrafica e degli accessi dei tecnici all'applicazione mobile.
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs value={value} onChange={handleChange} aria-label="Tabs gestione tecnici">
          <Tab 
            label="Anagrafica Tecnici" 
            icon={<PeopleIcon />} 
            iconPosition="start" 
            id="tecnici-tab-0" 
            aria-controls="tecnici-tabpanel-0" 
          />
          <Tab 
            label="Accesso App Tecnici" 
            icon={<LockOpenIcon />} 
            iconPosition="start" 
            id="tecnici-tab-1" 
            aria-controls="tecnici-tabpanel-1" 
          />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        <GestioneTecnici />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <GestioneAccessi />
      </TabPanel>
    </Box>
  );
};

export default TecniciPage;
