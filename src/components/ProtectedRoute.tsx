import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { CenteredCircularProgress } from '@/components/CenteredCircularProgress';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <CenteredCircularProgress />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
