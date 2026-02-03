import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth'; // Percorso corretto
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Verifica autenticazione in corso...</Typography>
        </Box>
    );
  }

  if (error) {
    // Potresti mostrare un messaggio di errore più specifico
    return <Navigate to="/login" state={{ from: location, error: 'Errore di autenticazione' }} replace />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
