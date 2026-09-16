import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { Box, CircularProgress, Typography, Paper, Button } from '@mui/material';
import { useAuthInitializer } from '@/auth/authHooks';
import { authService } from '@/auth/authService';
import { GlobalAlert } from '@/components/GlobalAlert';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { AnagraficheProvider } from '@/contexts/AnagraficheContext';

// Lazy load delle pagine
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ScadenzePage = lazy(() => import('@/pages/ScadenzePage'));
const TecniciPage = lazy(() => import('@/pages/TecniciPage'));
const DocumentiPage = lazy(() => import('@/pages/DocumentiPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const PresenzePage = lazy(() => import('@/pages/PresenzePage'));
const ReportisticaPage = lazy(() => import('@/pages/ReportisticaPage'));
const SincronizzazionePage = lazy(() => import('@/pages/SincronizzazionePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const RapportinoEdit = lazy(() => import('@/pages/RapportinoEdit'));
const RapportiniList = lazy(() => import('@/pages/RapportiniList'));
const AnagrafichePage = lazy(() => import('@/pages/AnagrafichePage'));

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

const AppContent = () => {
  const { authLoading, user, isAdmin } = useAuthStore();
  const isAppLoading = useRapportiniStore((state) => state.loading);
  const isAuthenticated = !!user;

  if (authLoading || isAppLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifica autorizzazioni e caricamento dati...</Typography>
      </Box>
    );
  }

  if (isAuthenticated && !isAdmin) {
    return <AccessDenied />;
  }

  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={!isAuthenticated ? <SignupPage /> : <Navigate to="/" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/scadenze" element={<ScadenzePage />} />
            <Route path="/anagrafiche/*" element={<AnagrafichePage />} />
            <Route path="/rapportini" element={<RapportiniList />} />
            <Route path="/rapportino/edit/new" element={<RapportinoEdit />} />
            <Route path="/rapportino/edit/:id" element={<RapportinoEdit />} />
            <Route path="/tecnici" element={<TecniciPage />} />
            <Route path="/documenti" element={<DocumentiPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/presenze" element={<PresenzePage />} />
            <Route path="/reportistica" element={<ReportisticaPage />} />
            <Route path="/sincronizzazione" element={<SincronizzazionePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  useAuthInitializer();

  return (
    <>
      <GlobalAlert />
      <AnagraficheProvider>
        <AppContent />
      </AnagraficheProvider>
    </>
  );
}

export default App;
