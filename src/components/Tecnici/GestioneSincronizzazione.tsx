
import React from 'react';
import { Box, Typography } from '@mui/material';

const GestioneSincronizzazione = () => {
  return (
    <Box>
      <Typography variant="h6">Stato Sincronizzazione Tecnici</Typography>
      <Typography variant="body2" color="text.secondary">
        Monitora qui lo stato di avanzamento della sincronizzazione dei dati per ciascun tecnico.
      </Typography>
      {/* Qui verrà implementata la tabella con i dati di sincro */}
    </Box>
  );
};

export default GestioneSincronizzazione;
