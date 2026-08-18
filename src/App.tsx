
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useGlobalStore } from './stores/globalStore'; 
import { Box, CircularProgress, Typography, Paper, Button } from '@mui/material';

import { useAuthInitializer } from '@/auth/authHooks';
import { authService } from '@/auth/authService';
import { DataHydrator } from '@/components/DataHydrator';
import { GlobalAlert } from '@/components/GlobalAlert';

import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';

// --- Le lazy Imports rimangono invariate ---
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const TecniciPage = lazy(() => import('@/pages/TecniciPage'));
const DocumentiPage = lazy(() => import('@/pages/DocumentiPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const PresenzePage = lazy(() => import('@/pages/PresenzePage'));
const ReportisticaPage = lazy(() => import('@/pages/ReportisticaPage'));
const ScadenzePage = lazy(() => import('@/pages/ScadenzePage'));
const SincronizzazionePage = lazy(() => import('@/pages/SincronizzazionePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const RapportinoEdit = lazy(() => import('@/pages/RapportinoEdit'));
const RapportinoPrintPage = lazy(() => import('@/pages/RapportinoPrint'));
const RapportiniList = lazy(() => import('@/pages/RapportiniList'));
const AnagrafichePage = lazy(() => import('@/pages/AnagrafichePage'));

// Componente per la schermata di Accesso Negato
const AccessDenied = () => {
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Errore durante il logout forzato:", error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', p: 2, backgroundColor: '#121212' }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, backgroundColor: '#1e1e1e', color: 'white' }}>
        <Typography variant="h4" gutterBottom color="error">
          Accesso Negato
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Non disponi dei privilegi di amministratore necessari per accedere a questa applicazione.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleLogout}>
          Torna alla pagina di Login
        </Button>
      </Paper>
    </Box>
  );
};

// Il componente UpdateNotifier è stato RIMOSSO.

const AppContent = () => {
  const isAuthLoading = useGlobalStore((state) => state.isAuthLoading);
  const isAuthenticated = useGlobalStore((state) => state.isAuthenticated);
  const isAdmin = useGlobalStore((state) => state.isAdmin);

  if (isAuthLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifica autorizzazioni...</Typography>
      </Box>
    );
  }

  if (isAuthenticated && !isAdmin) {
    return <AccessDenied />;
  }

  return (
    <>
      {isAuthenticated && isAdmin && <DataHydrator />}
      {/* La chiamata a UpdateNotifier è stata RIMOSSA. */}
      
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!isAuthenticated ? <SignupPage /> : <Navigate to="/" replace />} />
          <Route path="/rapportini/stampa/:id" element={<RapportinoPrintPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/anagrafiche/*" element={<AnagrafichePage />} />
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

          <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

function App() {
  useAuthInitializer();

  return (
    <>
      <GlobalAlert />
      <AppContent />
    </> 
  );
}

export default App;
