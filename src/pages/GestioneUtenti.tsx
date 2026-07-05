
import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

const PaginaInManutenzione: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '80vh',
        textAlign: 'center',
        p: 3,
      }}
    >
      <ConstructionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h4" component="h1" gutterBottom>
        Pagina in Manutenzione
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Questa sezione è temporaneamente non disponibile. Stiamo lavorando per ripristinarla il prima possibile.
      </Typography>
      <Alert severity="info" sx={{ maxWidth: '600px' }}>
        La funzionalità di gestione degli utenti è in fase di revisione per garantire maggiore stabilità e sicurezza.
      </Alert>
    </Box>
  );
};

export default PaginaInManutenzione;
