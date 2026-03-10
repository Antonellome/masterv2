import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import type { IAuthContext, AuthUser } from './AuthContext'; // MODIFICATO: Importo solo i tipi

// --- CREAZIONE DEL CONTESTO ---
// L'oggetto AuthContext viene creato qui, non importato.
const AuthContext = createContext<IAuthContext | undefined>(undefined);

// --- HOOK USEAUTH ---
// Questo è l'hook pubblico che i componenti useranno per accedere al contesto.
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth deve essere utilizzato all'interno di un AuthProvider");
    }
    return context;
};

// --- COMPONENTE PROVIDER ---
// Questo componente avvolge l'app e fornisce il valore del contesto.
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Monitora lo stato di autenticazione di Firebase
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe(); // Pulizia alla disconnessione
    }, []);

    const login = useCallback(async (email: string, pass: string) => {
      setLoading(true);
      setError(null);
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (e: any) {
        // Semplificazione del messaggio di errore
        setError("Credenziali non valide. Riprova.");
      } finally {
        setLoading(false);
      }
    }, []);

    const signup = useCallback(async (email: string, pass: string, nome: string, cognome: string) => {
      setLoading(true);
      setError(null);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;
        // Salva informazioni aggiuntive dell'utente
        await setDoc(doc(db, 'users', user.uid), {
          nome,
          cognome,
          email
        });
      } catch (e: any) { 
        setError("Errore durante la registrazione.");
      } finally {
        setLoading(false);
      }
    }, []);
    
    const logout = useCallback(async () => {
      setError(null);
      try {
        await signOut(auth);
      } catch (e: any) { 
        setError("Errore durante il logout.");
      }
    }, []);

    // Memoizzazione del valore del contesto per ottimizzare le performance
    const value = useMemo(() => ({
        user,
        loading,
        error,
        login,
        signup,
        logout,
        setError
    }), [user, loading, error, login, signup, logout]);

    // Fornisce il contesto ai componenti figli
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};