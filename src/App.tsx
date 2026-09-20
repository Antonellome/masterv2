
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useGlobalStore } from '@/stores/globalStore';
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

// --- Componente per Accesso Negato ---
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

// --- Componente per il Caricamento Globale ---
const GlobalLoader = ({ message }: { message: string }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
    <Typography sx={{ mt: 2 }}>{message}</Typography>
  </Box>
);

// --- Contenuto Principale dell'Applicazione ---
const AppContent = () => (
  <AnagraficheProvider>
    <Suspense fallback={<GlobalLoader message="Caricamento pagina..." />}>
      <Routes>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </AnagraficheProvider>
);

// --- Wrapper di Autenticazione e Autorizzazione ---
const AuthWrapper = () => {
  const { authLoading, user, isAdmin } = useAuthStore();
  const isAppLoading = useGlobalStore((state) => state.appLoading);
  const isAuthenticated = !!user;

  // 1. Caricamento iniziale (autenticazione o sync globale)
  if (authLoading || isAppLoading) {
    return <GlobalLoader message="Verifica autorizzazioni e caricamento dati..." />;
  }

  // 2. Utente non autenticato -> Pagine pubbliche
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<GlobalLoader message="Caricamento..." />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // 3. Utente autenticato ma non admin -> Accesso Negato
  if (!isAdmin) {
    return <AccessDenied />;
  }

  // 4. Utente autenticato e admin -> App principale
  return <AppContent />;
};

// --- Componente Root dell'App ---
function App() {
  useAuthInitializer(); // Hook che inizializza il listener di autenticazione

  return (
    <>
      <GlobalAlert />
      <AuthWrapper />
    </>
  );
}

export default App;
