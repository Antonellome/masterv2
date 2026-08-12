
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';
import { anagraficheConfig } from '@/config/anagrafiche.config';

// Importo i componenti che renderizzano le tabelle
import GestioneClienti from '@/components/Anagrafiche/GestioneClienti';
import GestioneNavi from '@/components/Anagrafiche/GestioneNavi';
import GestioneLuoghi from '@/components/Anagrafiche/GestioneLuoghi';
import GestioneDitte from '@/components/Anagrafiche/GestioneDitte';
import GestioneCategorie from '@/components/Anagrafiche/GestioneCategorie';
import GestioneVeicoli from '@/components/Anagrafiche/GestioneVeicoli';
import GestioneTipiGiornata from '@/components/Anagrafiche/GestioneTipiGiornata'; // <-- ECCO L'IMPORT MANCANTE

const AnagrafichePage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState<string | false>(false);

    const tabKeys = Object.keys(anagraficheConfig);

    useEffect(() => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const currentAnagrafica = pathSegments[pathSegments.length - 1];

        if (tabKeys.includes(currentAnagrafica)) {
            setCurrentTab(location.pathname);
        } else if (location.pathname === '/anagrafiche' && tabKeys.length > 0) {
            navigate(`/anagrafiche/${tabKeys[0]}`, { replace: true });
        }
    }, [location.pathname, navigate, tabKeys]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        navigate(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Tabs
                value={currentTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="nav tabs anagrafiche"
            >
                {tabKeys.map((key) => {
                    const config = anagraficheConfig[key as keyof typeof anagraficheConfig];
                    return (
                        <Tab
                            key={config.collectionName}
                            label={config.title}
                            component={NavLink}
                            to={`/anagrafiche/${config.collectionName}`}
                            value={`/anagrafiche/${config.collectionName}`}
                        />
                    );
                })}
            </Tabs>
            <Box sx={{ p: 3 }}>
                <Routes>
                  <Route path="clienti" element={<GestioneClienti />} />
                  <Route path="navi" element={<GestioneNavi />} />
                  <Route path="luoghi" element={<GestioneLuoghi />} />
                  <Route path="ditte" element={<GestioneDitte />} />
                  <Route path="categorie" element={<GestioneCategorie />} />
                  <Route path="veicoli" element={<GestioneVeicoli />} />
                  <Route path="tipiGiornata" element={<GestioneTipiGiornata />} /> {/* <-- ECCO LA ROTTA MANCANTE */}
                </Routes>
            </Box>
        </Box>
    );
};

export default AnagrafichePage;
