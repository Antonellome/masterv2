import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { Link, Outlet, useLocation } from 'react-router-dom';

const AnagrafichePage: React.FC = () => {
    const location = useLocation();

    const currentTab = location.pathname.split('/')[2] || 'clienti';

    const tabs = [
        { label: 'Clienti', value: 'clienti', path: '/anagrafiche/clienti' },
        { label: 'Navi', value: 'navi', path: '/anagrafiche/navi' },
        { label: 'Luoghi', value: 'luoghi', path: '/anagrafiche/luoghi' },
        { label: 'Ditte', value: 'ditte', path: '/anagrafiche/ditte' },
        { label: 'Categorie', value: 'categorie', path: '/anagrafiche/categorie' },
        { label: 'Tipi Giornata', value: 'tipi-giornata', path: '/anagrafiche/tipi-giornata' },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper', borderRadius: '8px 8px 0 0', flexShrink: 0 }}>
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
