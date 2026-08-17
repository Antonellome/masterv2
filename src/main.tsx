
// Import per inizializzare Firebase. DEVE essere il primo import legato all'app.
import '@/config/firebase';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { it } from 'date-fns/locale';

import App from './App';
import './index.css';
import '@/styles/global.css'; // <-- INIETTATO CSS GLOBALE PER SCROLLING
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DataProvider } from '@/contexts/DataContext';
import { attemptDbRecovery } from './db/recovery';

// ESEGUI IL CONTROLLO DI RECUPERO PRIMA DI QUALSIASI ALTRA COSA
attemptDbRecovery().then(() => {
  // Solo se il recupero non ha forzato un reload, monta l'app.
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <DataProvider>
          <Router>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
              <App />
            </LocalizationProvider>
          </Router>
        </DataProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
});
