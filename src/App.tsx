
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useGlobalStore } from './stores/globalStore'; 
import { Box, CircularProgress, Typography } from '@mui/material';

import { useAuthInitializer } from '@/auth';
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

const AppContent = () => {
  const isAuthLoading = useGlobalStore((state) => state.isAuthLoading);
  const isAuthenticated = useGlobalStore((state) => state.isAuthenticated);

  if (isAuthLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          Verifica autenticazione...
        </Typography>
      </Box>
    );
  }

  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={!isAuthenticated ? <SignupPage /> : <Navigate to="/" replace />} />
        <Route path="/rapportini/stampa/:id" element={<RapportinoPrintPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            {/* La rotta AnagrafichePage ora gestisce tutte le sue sotto-rotte interne */}
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
  );
};

function App() {
  useAuthInitializer();

  return (
    <>
      <GlobalAlert />
      <DataHydrator />
      <AppContent />
    </>
  );
}

export default App;
