import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Potremmo mostrare uno spinner di caricamento qui
    return <div>Caricamento...</div>;
  }

  if (!user) {
    // Se non c'è utente, reindirizza alla pagina di login
    return <Navigate to="/login" replace />;
  }

  // Se l'utente è loggato, mostra la pagina richiesta
  return <>{children}</>;
};

export default PrivateRoute;
