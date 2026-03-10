import React from 'react';
import { Typography, Paper } from '@mui/material';

const GestioneSincronizzazione: React.FC = () => {
    return (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h5" gutterBottom>
                Gestione Sincronizzazione
            </Typography>
            <Typography variant="body1">
                Questa sezione è dedicata alla gestione della sincronizzazione dei dati con i dispositivi mobili.
                Le funzionalità specifiche per la sincronizzazione verranno implementate qui.
            </Typography>
        </Paper>
    );
};

export default GestioneSincronizzazione;
