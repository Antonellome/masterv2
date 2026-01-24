import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByActivationCode, initializeFirebase } from '@/utils/firebase';
import { User } from '@/types';

const ACTIVATION_CODE_KEY = '@riso_app_activation_code';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (activationCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Funzione per controllare la sessione all'avvio dell'app
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      initializeFirebase(); // Assicuriamoci che Firebase sia inizializzato
      const activationCode = await AsyncStorage.getItem(ACTIVATION_CODE_KEY);

      if (activationCode) {
        console.log('[AuthContext] Found activation code, attempting to log in...');
        const fetchedUser = await getUserByActivationCode(activationCode);
        if (fetchedUser) {
          setUser(fetchedUser);
          console.log('[AuthContext] Auto-login successful for:', fetchedUser.nome);
        } else {
          console.log('[AuthContext] Code found but user does not exist anymore. Clearing code.');
          await AsyncStorage.removeItem(ACTIVATION_CODE_KEY);
        }
      } else {
        console.log('[AuthContext] No activation code found. User needs to log in manually.');
      }
    } catch (error) {
      console.error('[AuthContext] Error during auth status check:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (activationCode: string) => {
    setIsLoading(true);
    try {
      const fetchedUser = await getUserByActivationCode(activationCode);
      if (fetchedUser) {
        setUser(fetchedUser);
        await AsyncStorage.setItem(ACTIVATION_CODE_KEY, activationCode);
        console.log('[AuthContext] Login successful for:', fetchedUser.nome);
      } else {
        throw new Error('Codice di attivazione non valido o utente non trovato.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('[AuthContext] Logging out...');
    setUser(null);
    await AsyncStorage.removeItem(ACTIVATION_CODE_KEY);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
