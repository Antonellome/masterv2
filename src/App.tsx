
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { DataProvider } from '@/contexts/DataContext';
import { NotificationProvider } from '@/contexts/NotificationProvider';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { GlobalStyles, CircularProgress, Box } from '@mui/material';

import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';

// --- Lazy Loading delle Pagine ---
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
const AnagrafichePage = lazy(() => import('@/pages/AnagrafichePage'));
const AnagraficaDetailPage = lazy(() => import('@/pages/AnagraficaDetailPage'));

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

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <ThemeProvider>
      <GlobalStyles styles={{ a: { color: 'inherit', textDecoration: 'none' } }} />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <DataProvider>
              <AppFeatureProviders>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    
                    <Route path="/rapportini/stampa/:id" element={<RapportinoPrintPage />} />

                    <Route element={<ProtectedLayout />}>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      
                      <Route path="/anagrafiche" element={<AnagrafichePage />}>
                        <Route index element={<Navigate to="clienti" replace />} /> 
                        <Route path=":anagraficaType" element={<AnagraficaDetailPage />} />
                      </Route>

                      <Route path="/tecnici" element={<TecniciPage />} />
                      <Route path="/documenti" element={<DocumentiPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/presenze" element={<PresenzePage />} />
                      <Route path="/reportistica" element={<ReportisticaPage />} />
                      <Route path="/scadenze" element={<ScadenzePage />} />
                      <Route path="/sincronizzazione" element={<SincronizzazionePage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      
                      <Route path="/rapportini/nuovo" element={<RapportinoEdit />} />
                      <Route path="/rapportini/:id" element={<RapportinoEdit />} />

                    </Route>
                  </Routes>
                </Suspense>
              </AppFeatureProviders>
          </DataProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
