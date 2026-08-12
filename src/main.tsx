
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { it } from 'date-fns/locale';
import App from './App';
import './index.css';
import { attemptDbRecovery } from './db/recovery'; // <-- IMPORTA IL KILL SWITCH

// ESEGUI IL CONTROLLO DI RECUPERO PRIMA DI QUALSIASI ALTRA COSA
attemptDbRecovery().then(() => {
  // Solo se il recupero non ha forzato un reload, monta l'app.
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Router>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
          <App />
        </LocalizationProvider>
      </Router>
    </React.StrictMode>
  );
});
