import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export type UserRole = 'admin' | 'user';

interface UserData {
  nome: string;
  cognome: string;
  ruolo: UserRole;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  userRole: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, pass: string, nome: string, cognome: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const userDocRef = doc(db, 'utenti_master', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUserData(userDoc.data() as UserData);
                } else {
                    const defaultData: UserData = {
                      nome: user.displayName?.split(' ')[0] || 'Utente',
                      cognome: user.displayName?.split(' ')[1] || 'Nuovo',
                      ruolo: 'user',
                    };
                    await setDoc(userDocRef, defaultData);
                    setUserData(defaultData);
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, pass: string) => {
      setLoading(true);
      setError(null);
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, []);
    
    const loginWithGoogle = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (e: any) {
        setError(e.message);
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
          nome,
          cognome,
          ruolo: 'user' as UserRole
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, []);
    
    const logout = useCallback(async () => {
      // Non c'è bisogno di setLoading(true) qui, la logica onAuthStateChanged gestirà tutto
      setError(null);
      try {
        await signOut(auth);
      } catch (e: any) {
        setError(e.message);
      }
    }, []);

    // Creiamo il valore del contesto in modo STABILE con useMemo
    // L'oggetto `value` viene ricreato SOLO se una delle dipendenze (dati reali) cambia.
    const value = useMemo(() => {
        const userRole = userData?.ruolo || null;
        const isAdmin = userRole === 'admin';

        return {
            currentUser,
            userData,
            userRole,
            loading,
            isAdmin,
            login,
            loginWithGoogle,
            signup,
            logout,
            error
        };
    }, [currentUser, userData, loading, error, login, loginWithGoogle, signup, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth deve essere utilizzato all'interno di un AuthProvider");
    }
    return context;
};
