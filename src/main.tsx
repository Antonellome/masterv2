
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { GlobalStyles } from '@mui/material';

import App from './App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { DataProvider } from '@/contexts/DataContext';
import { NotificationProvider } from '@/contexts/NotificationProvider';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { AlertProvider } from '@/contexts/AlertContext';

import './index.css';
import 'dayjs/locale/it';
import './firebase';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <GlobalStyles styles={{ a: { color: 'inherit', textDecoration: 'none' } }} />
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='it'>
          <AuthProvider>
            <DataProvider>
              <RefreshProvider>
                <NotificationProvider>
                  <AlertProvider>
                    <App />
                  </AlertProvider>
                </NotificationProvider>
              </RefreshProvider>
            </DataProvider>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
