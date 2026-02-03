// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
// ERRORE QUI: L'import deve puntare al CONTESTO, non a un hook separato.
// import { useAuth } from '../hooks/useAuth'; // SBAGLIATO
import { useAuth } from '@/contexts/AuthContext'; // CORRETTO
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
