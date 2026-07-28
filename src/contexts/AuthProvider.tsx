
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
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
                // --- LOGICA DI AUTORIZZAZIONE CORRETTA BASATA SU FIRESTORE ---
                const adminDocRef = doc(db, "admins", firebaseUser.uid);
                const adminDocSnap = await getDoc(adminDocRef);
                
                setUser(firebaseUser);
                setIsAdmin(adminDocSnap.exists()); // L'utente è admin se il suo doc esiste nella collezione 'admins'
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

    const value = useMemo(() => ({
        user,
        isAdmin,
        loading,
        error,
        login,
        logout,
        setError,
    }), [user, isAdmin, loading, error, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
