import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { anagraficheConfig } from '@/config/anagrafiche.config.tsx';

const AnagrafichePage: React.FC = () => {
    const location = useLocation();

    // Determina la tab corrente basandosi sul percorso. Default alla prima anagrafica della configurazione.
    const currentTab = location.pathname.split('/')[2] || Object.keys(anagraficheConfig)[0];

    // Genera dinamicamente le tabs dalla configurazione
    const tabs = Object.keys(anagraficheConfig).map(key => ({
        label: anagraficheConfig[key].title.replace('Gestione ', ''),
        value: key,
        path: `/anagrafiche/${key}`,
    }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper', flexShrink: 0 }}>
                <Tabs 
                    value={currentTab}
                    aria-label="schede anagrafiche"
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    textColor="primary" 
                    indicatorColor="primary"
                >
                    {tabs.map((tab) => (
                        <Tab 
                            label={tab.label} 
                            value={tab.value}
                            key={tab.value}
                            component={Link} 
                            to={tab.path} 
                        />
                    ))}
                </Tabs>
            </Box>
            <Box sx={{ flexGrow: 1, pt: 3, display: 'flex', flexDirection: 'column' }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default AnagrafichePage;
