
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
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Non impostare loading a true qui per evitare di bloccare l'UI durante il refresh del token
                try {
                    const idTokenResult = await firebaseUser.getIdTokenResult(true);
                    const claims = idTokenResult.claims;
                    const role = claims.role as string;

                    setUserRole(role === 'admin' ? 'Amministratore' : 'Tecnico');
                    setUser(firebaseUser);

                } catch (e) {
                    console.error("AuthProvider: Errore nell'ottenere il token o i claims.", e);
                    setError("Impossibile verificare i permessi dell'utente.");
                    setUser(firebaseUser); // Manteniamo l'utente loggato ma con ruolo nullo
                    setUserRole(null);
                } finally {
                    setLoading(false); // Disattiva il loading iniziale solo dopo aver gestito l'utente
                }
            } else {
                setUser(null);
                setUserRole(null);
                setLoading(false);
            }
        });
        
        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, pass: string) => {
        setError(null);
        setLoading(true);
        try {
          await signInWithEmailAndPassword(auth, email, pass);
          // Il successo viene ora gestito da onAuthStateChanged, ma dobbiamo fermare il loading qui
          // per sbloccare la UI della pagina di login.
          setLoading(false); 
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
          setLoading(false); // Assicura che il loading si fermi anche in caso di errore
          throw new Error(errorMessage);
        }
    }, []);

    const logout = useCallback(async () => {
      setError(null);
      setLoading(true); // Mostra un feedback durante il logout
      try {
        await signOut(auth);
        // onAuthStateChanged gestirà la pulizia dello stato
      } catch (_e: unknown) {
        setError("Errore durante il logout.");
        setLoading(false); // Assicura che il loading si fermi se il logout fallisce
      }
    }, []);

    const value = useMemo(() => ({
        user,
        userRole,
        loading,
        error,
        login,
        logout,
        setError
    }), [user, userRole, loading, error, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
