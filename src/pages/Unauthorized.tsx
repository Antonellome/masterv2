
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';

const Unauthorized = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        textAlign: 'center',
        p: 3,
      }}
    >
      <LockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
      <Typography variant="h4" component="h1" gutterBottom>
        Accesso Negato
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Non disponi dei permessi necessari per visualizzare questa pagina.
      </Typography>
      <Button
        component={Link}
        to="/"
        variant="contained"
        color="primary"
      >
        Torna alla Dashboard
      </Button>
    </Box>
  );
};

export default Unauthorized;
