import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import type { IAuthContext, AuthUser } from './AuthContext';

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth deve essere utilizzato all'interno di un AuthProvider");
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // MODIFICA CRUCIALE:
                // Ad ogni cambio di stato (login, refresh pagina), forziamo
                // l'aggiornamento del token per garantire che i Custom Claims
                // (es. il ruolo 'admin') siano sempre letti e aggiornati.
                // Questa è la fonte di verità più affidabile.
                await user.getIdToken(true);
            }
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, pass: string) => {
      setLoading(true);
      setError(null);
      try {
        // Il login triggera onAuthStateChanged, che ora gestisce l'aggiornamento del token.
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (_e: unknown) {
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
        await setDoc(doc(db, 'users', user.uid), {
          nome,
          cognome,
          email
        });
      } catch (_e: unknown) {
        setError("Errore durante la registrazione.");
      } finally {
        setLoading(false);
      }
    }, []);
    
    const logout = useCallback(async () => {
      setError(null);
      try {
        await signOut(auth);
      } catch (_e: unknown) {
        setError("Errore durante il logout.");
      }
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        error,
        login,
        signup,
        logout,
        setError
    }), [user, loading, error, login, signup, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};