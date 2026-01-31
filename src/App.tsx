import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { DataProvider } from '@/contexts/DataContext';
import { NotificationProvider } from '@/contexts/NotificationProvider';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { GlobalStyles } from '@mui/material';

import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import TecniciPage from '@/pages/TecniciPage';
import VeicoliPage from '@/pages/VeicoliPage';
import DocumentiPage from '@/pages/DocumentiPage';
import NotificationsPage from '@/pages/NotificationsPage';
import PresenzePage from '@/pages/PresenzePage';
import ReportisticaPage from '@/pages/ReportisticaPage';
import ScadenzePage from '@/pages/ScadenzePage';
import SincronizzazionePage from '@/pages/SincronizzazionePage';
import SettingsPage from '@/pages/SettingsPage';
import RapportinoEdit from '@/pages/RapportinoEdit';
import RapportinoPrintPage from '@/pages/RapportinoPrint';

// Layout e Pagine Anagrafiche
import AnagrafichePage from '@/pages/AnagrafichePage';
import GestioneClienti from '@/pages/Anagrafiche/GestioneClienti'; 
import GestioneNavi from '@/pages/Anagrafiche/GestioneNavi'; 
import GestioneLuoghi from '@/pages/Anagrafiche/GestioneLuoghi'; 
import GestioneDitte from '@/pages/Anagrafiche/GestioneDitte';
import GestioneCategorie from '@/pages/Anagrafiche/GestioneCategorie';
import GestioneTipiGiornata from '@/pages/Anagrafiche/GestioneTipiGiornata';

const AppFeatureProviders = ({ children }: { children: React.ReactNode }) => (
    <NotificationProvider>
        <RefreshProvider>
          <AlertProvider>
            {children}
          </AlertProvider>
        </RefreshProvider>
    </NotificationProvider>
);

const ProtectedLayout = () => (
    <ProtectedRoute>
        <MainLayout />
    </ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider>
      <GlobalStyles styles={{ a: { color: 'inherit', textDecoration: 'none' } }} />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <DataProvider>
              <AppFeatureProviders>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  
                  {/* ROTTA DI STAMPA ISOLATA */}
                  <Route path="/rapportini/stampa/:id" element={<RapportinoPrintPage />} />

                  <Route element={<ProtectedLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    
                    {/* --- ROTTE ANAGRAFICHE --- */}
                    <Route path="/anagrafiche" element={<AnagrafichePage />}>
                      <Route index element={<Navigate to="clienti" replace />} /> 
                      <Route path="clienti" element={<GestioneClienti />} />
                      <Route path="navi" element={<GestioneNavi />} />
                      <Route path="luoghi" element={<GestioneLuoghi />} />
                      <Route path="ditte" element={<GestioneDitte />} />
                      <Route path="categorie" element={<GestioneCategorie />} />
                      <Route path="tipi-giornata" element={<GestioneTipiGiornata />} />
                    </Route>

                    <Route path="/tecnici" element={<TecniciPage />} />
                    <Route path="/veicoli" element={<VeicoliPage />} />
                    <Route path="/documenti" element={<DocumentiPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/presenze" element={<PresenzePage />} />
                    <Route path="/reportistica" element={<ReportisticaPage />} />
                    <Route path="/scadenze" element={<ScadenzePage />} />
                    <Route path="/sincronizzazione" element={<SincronizzazionePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    
                    {/* --- ROTTE RAPPORTINI --- */}
                    <Route path="/rapportini/nuovo" element={<RapportinoEdit />} />
                    <Route path="/rapportini/:id" element={<RapportinoEdit />} />

                  </Route>
                </Routes>
              </AppFeatureProviders>
          </DataProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;