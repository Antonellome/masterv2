import { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import Sidebar from '@/components/Sidebar';

// Importa tutti i componenti necessari per le anagrafiche
import GestioneTecnici from '@/components/Anagrafiche/GestioneTecnici';
import GestioneVeicoli from '@/components/Anagrafiche/GestioneVeicoli';
import GestioneClienti from '@/components/Anagrafiche/GestioneClienti';
import GestioneNavi from '@/components/Anagrafiche/GestioneNavi';
import GestioneLuoghi from '@/components/Anagrafiche/GestioneLuoghi';
import GestioneDitte from '@/components/Anagrafiche/GestioneDitte';
import GestioneCategorie from '@/components/Anagrafiche/GestioneCategorie';
import GestioneTipiGiornata from '@/components/GestioneTipiGiornata';

const anagraficheMenu = [
    { text: 'Clienti', path: 'clienti' },
    { text: 'Navi', path: 'navi' },
    { text: 'Luoghi', path: 'luoghi' },
    { text: 'Tecnici', path: 'tecnici' },
    { text: 'Veicoli', path: 'veicoli' },
    { text: 'Ditte', path: 'ditte' },
    { text: 'Categorie Tecnici', path: 'categorie' },
    { text: 'Tipi Giornata', path: 'tipigiornata' },
];

function ErrorFallback({ error }: { error: Error }) {
    return (
        <Paper sx={{ p: 4, margin: 2, backgroundColor: '#ffebee' }}>
            <Typography variant="h6" color="error">Si è verificato un errore</Typography>
            <Typography color="error">{error.message}</Typography>
        </Paper>
    );
}

// Definiamo il router per le anagrafiche qui
const AnagraficheRoutes = () => (
    <Routes>
        {/* Impostiamo la rotta di default per visualizzare GestioneClienti */}
        <Route index element={<Navigate to="clienti" replace />} />
        <Route path="clienti" element={<GestioneClienti />} />
        <Route path="navi" element={<GestioneNavi />} />
        <Route path="luoghi" element={<GestioneLuoghi />} />
        <Route path="tecnici" element={<GestioneTecnici />} />
        <Route path="veicoli" element={<GestioneVeicoli />} />
        <Route path="ditte" element={<GestioneDitte />} />
        <Route path="categorie" element={<GestioneCategorie />} />
        <Route path="tipigiornata" element={<GestioneTipiGiornata />} />
    </Routes>
);


const AnagrafichePage = () => {
    return (
        <Box sx={{ display: 'flex' }}>
            <Sidebar menuItems={anagraficheMenu} basePath="/anagrafiche" />
            <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Suspense fallback={<CircularProgress />}>
                       {/* Utilizziamo il router definito sopra */}
                       <AnagraficheRoutes />
                    </Suspense>
                </ErrorBoundary>
            </Box>
        </Box>
    );
};

export default AnagrafichePage;
