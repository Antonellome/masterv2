
import { User } from 'firebase/auth';

// 1. Definiamo i nuovi ruoli, esattamente come nel nostro piano.
export type UserRole = 'Amministratore' | 'Tecnico' | null;

// 2. Semplifichiamo drasticamente l'interfaccia del nostro Context.
//    Non abbiamo più bisogno di dati complessi come `userData` o `isAdmin`.
//    Il `userRole` è l'unica fonte di verità.
export interface IAuthContext {
  user: User | null;
  userRole: UserRole;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, nome: string, cognome: string) => Promise<void>;
  logout: () => Promise<void>;
  setError: (error: string | null) => void;
}

// NOTA: Non ho cambiato il nome dell'interfaccia da IAuthContext a AuthContextType
// per minimizzare il numero di modifiche necessarie negli altri file.
// Mi sto concentrando sulla logica, non sulla cosmetica.
