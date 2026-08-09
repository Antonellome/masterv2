import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const RapportiniPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Elenco Rapportini
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/rapportini/nuovo')}
        >
          Nuovo Rapportino
        </Button>
        <Box sx={{ mt: 4 }}>
          <Typography variant="body1">
            (Qui verrà visualizzata la tabella con l'elenco dei rapportini)
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default RapportiniPage;
