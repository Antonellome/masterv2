
import { create } from 'zustand';
import { User } from 'firebase/auth'; // Importa il tipo User
import { UserProfile } from '@/models/definitions'; // Assumendo che UserProfile esista
import { api } from '@/services/api'; // Assumendo che api esista

// Definisce la struttura dello slice di autenticazione
interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthLoading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void; // Azione per aggiornare l'utente da auth.ts
  setUserProfile: (profile: UserProfile | null) => void; // Azione per aggiornare il profilo
  setIsAuthLoading: (loading: boolean) => void;
}

// Estende GlobalState con AuthState
interface GlobalState extends AuthState {}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  // Stato iniziale per l'autenticazione
  user: null,
  userProfile: null,
  isAuthLoading: true, // Inizia come true finché non si riceve il primo stato da Firebase
  isAdmin: false,

  // Azioni di autenticazione
  login: async (email, password) => {
    // La logica effettiva di login con Firebase Auth sarà qui
    // Esempio: await signInWithEmailAndPassword(auth, email, password);
  },
  logout: async () => {
    // La logica di logout sarà qui
    // Esempio: await signOut(auth);
  },

  // Azioni per aggiornare lo stato dall'esterno (es. da auth.ts)
  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile, isAdmin: profile?.isAdmin ?? false }),
  setIsAuthLoading: (loading) => set({ isAuthLoading: loading }),
}));
