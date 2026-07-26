
import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthProvider';
import { DataProvider } from '@/contexts/DataContext';
import { NotificationProvider } from '@/contexts/NotificationProvider';
import { RefreshProvider, useRefresh } from '@/contexts/RefreshContext'; // 1. IMPORTIAMO useRefresh
import { AlertProvider } from '@/contexts/AlertContext';
import { GlobalStyles, Box, CircularProgress, Typography } from '@mui/material';

import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { syncStandard } from '@/services/SyncService';

// --- Lazy Imports (invariati) ---
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
const GestioneAnagrafica = lazy(() => import('@/pages/GestioneAnagrafica'));

// --- Componente AppContent con Logica di Sincronizzazione CORRETTA ---
const AppContent = () => {
  const { loading: authLoading, user } = useAuth();
  const { refreshKey } = useRefresh(); // 2. USIAMO l'hook per ascoltare i cambiamenti
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const runSync = async () => {
      if (user) {
        setIsSyncing(true);
        console.log(`Sincronizzazione avviata. Trigger: ${refreshKey > 0 ? 'Manuale' : 'Login'}`);
        try {
          await syncStandard();
          console.log("Sincronizzazione completata con successo.");
        } catch (error) {
          console.error("Errore critico durante la sincronizzazione:", error);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setIsSyncing(false);
      }
    };

    // Eseguiamo la sincro solo quando l'autenticazione è terminata
    if (!authLoading) {
      runSync();
    }
  // 3. L'effetto si ri-esegue quando l'utente cambia (login/logout) O quando la refreshKey cambia (click manuale)
  }, [user, authLoading, refreshKey]);

  // Loader durante auth o sync
  if (authLoading || isSyncing) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          {authLoading ? 'Verifica autenticazione...' : 'Sincronizzazione dati in corso...'}
        </Typography>
      </Box>
    );
  }

  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
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
    </Suspense>
  );
};

function App() {
  return (
    <ThemeProvider>
      <GlobalStyles styles={{ a: { color: 'inherit', textDecoration: 'none' } }} />
      <AuthProvider>
        <NotificationProvider>
          <RefreshProvider> 
            <AlertProvider>
              <DataProvider>
                <AppContent />
              </DataProvider>
            </AlertProvider>
          </RefreshProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
