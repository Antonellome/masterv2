
import { Navigate, Outlet } from 'react-router-dom';
import { useGlobalStore } from '@/stores/globalStore';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = () => {
  const user = useGlobalStore((state) => state.user);
  const isAuthLoading = useGlobalStore((state) => state.isAuthLoading);

  if (isAuthLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Qui è dove la magia accade. Questo Box fornisce il contenitore a piena altezza
  // che mancava a MainLayout e a tutte le pagine figlie.
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Outlet />
    </Box>
  );
};

export default ProtectedRoute;
