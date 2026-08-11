
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { it } from 'date-fns/locale';
import './index.css';

// L'inizializzazione dell'autenticazione ora avviene DENTRO l'app React

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
        <App />
      </LocalizationProvider>
    </Router>
  </React.StrictMode>
);
