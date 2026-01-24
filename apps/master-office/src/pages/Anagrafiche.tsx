import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import Sidebar from '@/components/Sidebar';

// Importa tutti i componenti necessari per le anagrafiche
import GestioneTecnici from '@/components/Anagrafiche/GestioneTecnici';
import GestioneVeicoli from '@/components/Anagrafiche/GestioneVeicoli';
import GestioneClienti from '@/components/Anagrafiche/GestioneClienti'; // Aggiunto
import GestioneNavi from '@/components/Anagrafiche/GestioneNavi';         // Aggiunto
import GestioneLuoghi from '@/components/Anagrafiche/GestioneLuoghi';     // Aggiunto
import GestioneDitte from '@/components/Anagrafiche/GestioneDitte';
import GestioneCategorie from '@/components/GestioneCategorie';
import GestioneTipiGiornata from '@/components/GestioneTipiGiornata';

// Aggiorna il menu per includere tutte le voci richieste
const anagraficheMenu = [
    { text: 'Clienti', path: 'clienti' }, // Aggiunto
    { text: 'Navi', path: 'navi' },         // Aggiunto
    { text: 'Luoghi', path: 'luoghi' },     // Aggiunto
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

// Router per gestire le viste delle anagrafiche
const AnagraficheRouter = () => (
    <Suspense fallback={<CircularProgress />}>
        <Routes>
            <Route path="clienti" element={<GestioneClienti />} />
            <Route path="navi" element={<GestioneNavi />} />
            <Route path="luoghi" element={<GestioneLuoghi />} />
            <Route path="tecnici" element={<GestioneTecnici />} />
            <Route path="veicoli" element={<GestioneVeicoli />} />
            <Route path="ditte" element={<GestioneDitte />} />
            <Route path="categorie" element={<GestioneCategorie />} />
            <Route path="tipigiornata" element={<GestioneTipiGiornata />} />
            <Route index element={<Navigate to="clienti" replace />} />
        </Routes>
    </Suspense>
);

const AnagrafichePage = () => {
    return (
        <Box sx={{ display: 'flex' }}>
            <Sidebar menuItems={anagraficheMenu} basePath="/anagrafiche" />
            <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <AnagraficheRouter />
                </ErrorBoundary>
            </Box>
        </Box>
    );
};

export default AnagrafichePage;
