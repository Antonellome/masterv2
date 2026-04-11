import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthProvider';
import { DataProvider } from '@/contexts/DataContext';
import { NotificationProvider } from '@/contexts/NotificationProvider';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { GlobalStyles, Box, CircularProgress } from '@mui/material';

import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import TecniciPage from '@/pages/TecniciPage';
import DocumentiPage from '@/pages/DocumentiPage';
import NotificationsPage from '@/pages/NotificationsPage';
import PresenzePage from '@/pages/PresenzePage';
import ReportisticaPage from '@/pages/ReportisticaPage';
import ScadenzePage from '@/pages/ScadenzePage';
import SincronizzazionePage from '@/pages/SincronizzazionePage';
import SettingsPage from '@/pages/SettingsPage';
import RapportinoEdit from '@/pages/RapportinoEdit';
import RapportinoPrintPage from '@/pages/RapportinoPrint';
import RapportiniList from '@/pages/RapportiniList';

// Pagine Anagrafiche Dinamiche
import AnagrafichePage from '@/pages/AnagrafichePage';
import GestioneAnagrafica from '@/pages/GestioneAnagrafica';

const AppFeatureProviders = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>
    <RefreshProvider>
      <AlertProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </AlertProvider>
    </RefreshProvider>
  </NotificationProvider>
);

const AppRoutes = () => {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" replace />} />
      <Route path="/rapportini/stampa/:id" element={<RapportinoPrintPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/anagrafiche" element={<AnagrafichePage />}>
            <Route index element={<Navigate to="clienti" replace />} />
            <Route path=":anagraficaId" element={<GestioneAnagrafica />} />
          </Route>
          <Route path="/rapportini" element={<RapportiniList />} />
          <Route path="/rapportino/edit/new" element={<RapportinoEdit />} />
          <Route path="/rapportino/edit/:id" element={<RapportinoEdit />} />
          <Route path="/tecnici" element={<TecniciPage />} />
          <Route path="/documenti" element={<DocumentiPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/presenze" element={<PresenzePage />} />
          <Route path="/reportistica" element={<ReportisticaPage />} />
          <Route path="/scadenze" element={<ScadenzePage />} />
          <Route path="/sincronizzazione" element={<SincronizzazionePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <GlobalStyles styles={{ a: { color: 'inherit', textDecoration: 'none' } }} />
      <AuthProvider>
        <AppFeatureProviders>
          <AppRoutes />
        </AppFeatureProviders>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
