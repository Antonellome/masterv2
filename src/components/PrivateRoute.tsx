import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useGlobalStore } from '@/stores/globalStore'; // SOSTITUITO

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  // Lettura dallo store globale invece che dal vecchio context
  const user = useGlobalStore(state => state.user);
  const loading = useGlobalStore(state => state.loadingInitialAuth);

  if (loading) {
    // Mostra uno spinner di caricamento globale o un placeholder
    return <div>Caricamento sessione utente...</div>;
  }

  if (!user) {
    // Se non c'è utente dopo il caricamento, reindirizza alla pagina di login
    return <Navigate to="/login" replace />;
  }

  // Se l'utente è loggato, mostra la pagina richiesta
  return <>{children}</>;
};

export default PrivateRoute;
