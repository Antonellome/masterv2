import React from 'react';
import GestioneSincronizzazione from '../components/Tecnici/GestioneSincronizzazione';
import { Container, Typography } from '@mui/material';

const GestioneSincronizzazioneTab: React.FC = () => {
    return (
        <Container maxWidth="lg">
            <Typography variant="h4" sx={{ mb: 3 }}>
                Sincronizzazione Dati
            </Typography>
            <GestioneSincronizzazione />
        </Container>
    );
};

export default GestioneSincronizzazioneTab;
