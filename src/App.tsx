
import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { useRefresh } from '@/contexts/RefreshContext';
import { useAlert } from '@/contexts/AlertContext'; // <-- 1. IMPORTIAMO useAlert
import { Box, CircularProgress, Typography } from '@mui/material';

import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { syncAnagrafiche, syncRapportini } from '@/services/SyncService';

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

const AppContent = () => {
  const { loading: authLoading, user } = useAuth();
  const { refreshKey } = useRefresh();
  const { showAlert } = useAlert(); // <-- 2. INIZIALIZZIAMO L'HOOK
  const [syncState, setSyncState] = useState({ syncing: false, message: '' });

  useEffect(() => {
    const runSync = async () => {
      if (user) {
        console.log(`Sincronizzazione avviata. Trigger: ${refreshKey > 0 ? 'Manuale' : 'Login'}`);
        
        setSyncState({ syncing: true, message: 'Sincronizzazione anagrafiche...' });
        try {
          // 3. CATTURIAMO I CONFLITTI E MOSTRIAMO LE NOTIFICHE
          const anagraficheConflicts = await syncAnagrafiche();
          if (anagraficheConflicts.length > 0) {
            anagraficheConflicts.forEach(msg => showAlert(msg, 'warning'));
          }
          console.log("Sincronizzazione anagrafiche completata.");

          setSyncState({ syncing: true, message: 'Sincronizzazione rapportini...' });
          const rapportiniConflicts = await syncRapportini();
          if (rapportiniConflicts.length > 0) {
            rapportiniConflicts.forEach(msg => showAlert(msg, 'warning'));
          }
          console.log("Sincronizzazione rapportini completata.");

        } catch (error) {
          console.error("Errore critico durante la sincronizzazione:", error);
          showAlert('Errore grave di sincronizzazione. Controlla la console.', 'error');
        } finally {
          setSyncState({ syncing: false, message: '' });
        }
      } else {
        setSyncState({ syncing: false, message: '' });
      }
    };

    if (!authLoading) {
      runSync();
    }
    // 4. AGGIUNGIAMO showAlert ALLE DIPENDENZE
  }, [user, authLoading, refreshKey, showAlert]);

  if (authLoading || syncState.syncing) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          {authLoading ? 'Verifica autenticazione...' : syncState.message}
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
  return <AppContent />;
}

export default App;
