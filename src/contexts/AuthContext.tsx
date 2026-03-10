
// src/contexts/AuthContext.tsx
import { User } from 'firebase/auth';

/**
 * Questo file definisce SOLO i TIPI per il contesto di autenticazione.
 * La logica effettiva, il Provider e l'hook `useAuth` si trovano 
 * esclusivamente in `AuthProvider.tsx` per garantire una singola fonte di verità.
 */

// Tipo per l'utente, che può essere un oggetto User di Firebase o null.
export type AuthUser = User | null;

// Interfaccia che definisce la forma del nostro contesto di autenticazione.
export interface IAuthContext {
  user: AuthUser;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nome: string, cognome: string) => Promise<void>;
  logout: () => Promise<void>;
  setError: (message: string | null) => void;
}
