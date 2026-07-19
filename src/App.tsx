
import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthProvider';
import { DataProvider } from '@/contexts/DataContext';
import { NotificationProvider } from '@/contexts/NotificationProvider';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { GlobalStyles, Box, CircularProgress, Typography } from '@mui/material';

import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { syncStandard } from '@/services/SyncService';

// ... (lazy imports invariati)
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


const AppContent = () => {
  const { loading: authLoading, user } = useAuth();
  const [syncing, setSyncing] = useState(true);
  const initialSyncDone = useRef(false); // Flag per tracciare la prima sincronizzazione

  useEffect(() => {
    const runSync = async () => {
      // Esegui solo se c'è un utente e la sincronizzazione iniziale non è ancora avvenuta
      if (user && !initialSyncDone.current) {
        initialSyncDone.current = true; // Imposta il flag per prevenire esecuzioni future
        setSyncing(true);
        console.log("Utente autenticato, avvio sincronizzazione standard UNA TANTUM.");
        await syncStandard();
        console.log("Sincronizzazione standard completata.");
        setSyncing(false);
      } else if (!user) {
        // Se l'utente fa logout, resetta il flag
        initialSyncDone.current = false;
        setSyncing(false); 
      }
    };

    if (!authLoading) {
       runSync();
    }
  }, [user, authLoading]); // Dipende da user e authLoading per gestire login/logout

  // Mostra il loader durante l'autenticazione iniziale o la primissima sincronizzazione
  if (authLoading || (user && syncing && !initialSyncDone.current)) {
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
