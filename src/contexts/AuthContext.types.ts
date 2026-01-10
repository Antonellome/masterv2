import { createContext } from 'react';
import { User } from 'firebase/auth';

export type UserRole = 'admin' | 'user';

// Definizione di un tipo specifico per i dati dell'utente
export interface UserData {
  nome: string;
  cognome: string;
  ruolo: UserRole;
  // Aggiungi altri campi se necessario
}

export interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null; // Usa il tipo specifico
  userRole: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
