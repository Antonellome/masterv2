
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth } from '@/firebase';
import { UserRole } from '@/models/definitions';
import type { IAuthContext } from './AuthContext.types';

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth deve essere utilizzato all'interno di un AuthProvider");
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            if (firebaseUser) {
                // CORREZIONE: Leggiamo i permessi REALI dal token dell'utente.
                const idTokenResult = await firebaseUser.getIdTokenResult(true); // Forza l'aggiornamento del token
                const userIsAdmin = !!idTokenResult.claims.role && idTokenResult.claims.role === 'admin';
                
                setUser(firebaseUser);
                setIsAdmin(userIsAdmin); // Imposta lo stato REALE.
                setError(null);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, pass: string) => {
        setError(null);
        setLoading(true);
        try {
          await signInWithEmailAndPassword(auth, email, pass);
        } catch (err: unknown) {
          const error = err as { code?: string };
          let errorMessage = "Credenziali non valide o errore sconosciuto.";
          switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-email':
            case 'auth/invalid-login-credentials':
              errorMessage = "Credenziali non valide. Controlla email e password.";
              break;
            case 'auth/user-disabled':
              errorMessage = "Questo account utente è stato disabilitato.";
              break;
          }
          setError(errorMessage);
          setLoading(false);
          throw new Error(errorMessage);
        }
    }, []);

    const logout = useCallback(async () => {
      setError(null);
      setLoading(true);
      try {
        await signOut(auth);
      } catch (_e: unknown) {
        setError("Errore durante il logout.");
      }
    }, []);

    // Funzione per forzare il refresh del token e dello stato admin
    const forceRefreshUserToken = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const idTokenResult = await currentUser.getIdTokenResult(true); // Forza il refresh
            const userIsAdmin = !!idTokenResult.claims.role && idTokenResult.claims.role === 'admin';
            setIsAdmin(userIsAdmin);
        }
    }, []);

    const value = useMemo(() => ({
        user,
        isAdmin,
        loading,
        error,
        login,
        logout,
        setError,
        forceRefreshUserToken // Esponiamo la funzione di refresh
    }), [user, isAdmin, loading, error, login, logout, forceRefreshUserToken]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
