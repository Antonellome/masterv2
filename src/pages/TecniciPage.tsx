
import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import GestioneTecnici from '@/components/Tecnici/GestioneTecnici';
import SincronizzatiApp from '@/components/Tecnici/SincronizzatiApp';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tecnici-tabpanel-${index}`}
      aria-labelledby={`tecnici-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `tecnici-tab-${index}`,
    'aria-controls': `tecnici-tabpanel-${index}`,
  };
}

const TecniciPage = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="schede tecnici">
          <Tab label="Gestione Tecnici" {...a11yProps(0)} />
          <Tab label="Accesso App" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <GestioneTecnici />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <SincronizzatiApp />
      </CustomTabPanel>
    </Box>
  );
};

export default TecniciPage;
