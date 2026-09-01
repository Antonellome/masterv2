import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = () => {
  const { user, authLoading, isAdmin } = useAuthStore((state) => ({
    user: state.user,
    authLoading: state.authLoading,
    isAdmin: state.isAdmin,
  }));

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se l'utente non è un admin, l'accesso è gestito a livello superiore in App.tsx,
  // ma un doppio controllo qui non fa male.
  if (!isAdmin) {
      return <Navigate to="/login" replace />; // O una pagina di accesso negato dedicata se esistesse a una rotta pubblica
  }

  // Se l'utente è autenticato e admin, renderizza le pagine protette.
  return <Outlet />;
};

export default ProtectedRoute;
