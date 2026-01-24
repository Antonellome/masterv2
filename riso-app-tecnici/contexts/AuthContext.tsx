import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../utils/firebase'; // Percorso corretto a firebase
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Creazione del contesto con un valore di default undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook custom per accedere facilmente al contesto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Props per il Provider
interface AuthProviderProps {
  children: ReactNode;
}

// Componente Provider
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listener per i cambiamenti dello stato di autenticazione di Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); // Imposta l'utente (o null se non loggato)
      setIsLoading(false); // Fine del caricamento iniziale
    });

    // Cleanup della sottoscrizione quando il componente viene smontato
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Lo stato dell'utente verrà aggiornato automaticamente dal listener onAuthStateChanged
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Il valore fornito dal contesto
  const value = {
    user,
    isLoading,
    login,
    logout,
  };

  // Se sta ancora caricando lo stato iniziale, possiamo mostrare uno splash screen o null
  if (isLoading) {
    return null; // O un componente di caricamento globale
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};