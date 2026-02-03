import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextType } from '@/models/definitions';

/**
 * Hook personalizzato per accedere al contesto di autenticazione.
 * 
 * @returns {AuthContextType} Il valore del contesto di autenticazione.
 * @throws {Error} Se l'hook viene utilizzato al di fuori di un AuthProvider.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth deve essere utilizzato all\'interno di un AuthProvider');
  }

  return context;
};
