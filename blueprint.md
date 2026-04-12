# R.I.S.O. - Ricerca Intelligente per la Selezione di Opportunità

## Stato del Progetto: App Completata - Fase di Test Finale

## Overview

R.I.S.O. è un'applicazione web progettata per aiutare gli utenti a scoprire e visualizzare informazioni su bandi, concorsi e opportunità di lavoro, filtrandole in base alle loro preferenze e competenze. Sfrutta Firebase per l'autenticazione, la gestione dei dati e la logica di business.

## Architettura e Funzionalità Implementate

### Frontend (React + Material-UI)
- **Struttura:** Basata su componenti React con Vite.
- **Stile:** Utilizzo di Material-UI (MUI) per un'interfaccia moderna, pulita e responsive.
- **Routing:** Gestione della navigazione con `react-router-dom`, che include:
    - **Rotte Pubbliche:** Pagina di Login (`/login`) e Registrazione (`/register`).
    - **Rotte Protette:** Una `Dashboard` (`/`) accessibile solo agli utenti autenticati.
- **Gestione Stato:** Centralizzazione dello stato di autenticazione tramite un `AuthProvider` con `useContext`.
- **Componenti UI:**
    - `LoginPage.tsx`: Form di accesso.
    - `RegisterPage.tsx`: Form di registrazione.
    - `Dashboard.tsx`: Pagina principale post-login.
    - `Navbar.tsx`: Barra di navigazione contestuale (mostra opzioni diverse se l'utente è loggato o meno).
    - `ProtectedRoute.tsx`: Wrapper per le rotte che richiedono autenticazione.

### Backend e Infrastruttura (Firebase)
- **Autenticazione:**
    - Sistema di login e registrazione con Email/Password.
    - Gli utenti sono gestiti nel servizio Firebase Authentication.
- **Database:**
    - Cloud Firestore per la persistenza dei dati (es. 'giornate').
- **Sicurezza:**
    - **Firebase App Check:** Integrazione con reCAPTCHA v3 per proteggere le chiamate al backend.
    - **Enforcement Attivo:** App Check è in modalità 'enforced' per i servizi di Authentication e Cloud Functions, simulando l'ambiente di produzione.
- **Cloud Functions:**
    - Logica di business lato server (es. la procedura di 'sterilizzazione' ora rimossa).

## Fase Attuale: Test Finale

L'applicazione è considerata completa nelle sue funzionalità principali. L'obiettivo attuale è verificare il corretto funzionamento di tutti i flussi in un ambiente il più vicino possibile a quello di produzione, con tutte le misure di sicurezza attive.

**Test da Eseguire:**
- [X] Flusso di login e logout con App Check attivo.
- [ ] Corretta visualizzazione dei dati nella Dashboard.
- [ ] Funzionamento dei filtri e della ricerca (se presenti).
- [ ] Comportamento responsive su diverse dimensioni di schermo.
