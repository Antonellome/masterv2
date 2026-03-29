
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import type { IAuthContext, AuthUser } from './AuthContext.types';

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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
            if (firebaseUser) {
                try {
                    // 1. Forza l'aggiornamento del token per ottenere i custom claims più recenti
                    const tokenResult = await firebaseUser.getIdTokenResult(true);
                    
                    // 2. Recupera i dati dal documento Firestore
                    const userDocRef = doc(db, "utenti_master", firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    let userData: Partial<AuthUser> = {};
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        userData = {
                            nome: data.nome,
                            cognome: data.cognome
                        };
                    }
                    
                    // 3. Combina l'utente Firebase con i claims e i dati di Firestore
                    const userWithRole: AuthUser = {
                        ...firebaseUser,
                        ...userData, // Aggiunge nome e cognome
                        role: tokenResult.claims.role || 'guest', // Aggiunge il ruolo dai claims
                    };

                    setUser(userWithRole);

                } catch (error) {
                    console.error("Errore nel recuperare i dati dell'utente:", error);
                    // In caso di errore, imposta l'utente base per non bloccare il flusso
                    setUser(firebaseUser);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, pass: string) => {
      setLoading(true);
      setError(null);
      try {
        if (!email || !pass) {
          setError("Email e password sono obbligatori.");
          setLoading(false);
          return;
        }
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (err: unknown) {
        console.error("ERRORE REALE DA FIREBASE:", err);
        const error = err as { code?: string };
        switch (error.code) {
          case 'auth/user-not-found':
            setError("Nessun utente trovato con questa email.");
            break;
          case 'auth/wrong-password':
            setError("Password errata. Riprova.");
            break;
          case 'auth/invalid-email':
            setError("L'indirizzo email non è valido.");
            break;
          case 'auth/user-disabled':
            setError("Questo account utente è stato disabilitato.");
            break;
          case 'auth/invalid-login-credentials':
            setError("Credenziali non valide. Controlla email e password.");
            break;
          default:
            setError("Credenziali non valide o errore sconosciuto.");
            break;
        }
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
        
        await setDoc(doc(db, 'utenti_master', user.uid), {
          uid: user.uid,
          nome,
          cognome,
          email,
          ruolo: 'utente', // Ruolo di default, da modificare via admin
          disabled: false
        });

      } catch (_e: unknown) {
        const error = _e as { code?: string };
        if (error.code === 'auth/email-already-in-use') {
            setError("Questa email è già registrata.");
        } else {
            setError("Errore durante la registrazione. Riprova.");
        }
        throw error;
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
