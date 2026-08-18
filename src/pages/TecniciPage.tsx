
import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GestioneTecnici from '@/components/Tecnici/GestioneTecnici';
import GestioneAccessi from '@/components/Tecnici/GestioneAccessi';

const TecniciPage = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
        <Tabs value={value} onChange={handleChange} aria-label="Tabs gestione tecnici">
          <Tab 
            label="Anagrafica Tecnici" 
            icon={<PeopleIcon />} 
            iconPosition="start" 
          />
          <Tab 
            label="Accesso App Tecnici" 
            icon={<LockOpenIcon />} 
            iconPosition="start" 
          />
        </Tabs>
      </Box>
      {/* 
        Container per il contenuto dei tab. 
        Rimuovendo `height: '100%'` si risolve il problema di layout della DataGrid.
        `flex: 1` è sufficiente per far sì che il box occupi tutto lo spazio verticale rimanente.
        `minHeight: 0` è una best practice per prevenire problemi di overflow in layout flex.
      */}
      <Box sx={{ flex: 1, p: 3, minHeight: 0 }}>
        {value === 0 && <GestioneTecnici />}
        {value === 1 && <GestioneAccessi />}
      </Box>
    </Box>
  );
};

export default TecniciPage;
