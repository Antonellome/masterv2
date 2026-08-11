
import { Navigate, Outlet } from 'react-router-dom';
import { useGlobalStore } from '@/stores/globalStore'; // <-- 1. IMPORTIAMO ZUSTAND
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = () => {
  // 2. UTILIZZIAMO useGlobalStore INVECE DI useAuth
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

  return <Outlet />;
};

export default ProtectedRoute;
