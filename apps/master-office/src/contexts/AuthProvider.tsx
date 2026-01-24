import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    type User, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc } from 'firebase/firestore'; // Importa le funzioni di Firestore
import { auth, db } from '@/firebase'; // Importa la configurazione del db
import { AuthContext, type UserRole } from './AuthContext'; // Importa UserRole

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Utente loggato, recupero il ruolo da Firestore
        const userDocRef = doc(db, 'utenti_master', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.ruolo || 'user'); // Default a 'user' se il ruolo non è specificato
          } else {
            // L'utente esiste in Auth ma non in `utenti_master`, trattalo come 'user'
            // Potresti anche creare un documento di default qui, se necessario
            setUserRole('user');
          }
        } catch (e) {
          console.error("Errore nel recuperare il ruolo dell'utente:", e);
          setUserRole('user'); // In caso di errore, default a 'user' per sicurezza
        }
      } else {
        // Nessun utente loggato
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        if (err instanceof FirebaseError) {
            setError(err.code || err.message);
        } else {
            setError('An unexpected error occurred.');
        }
    } finally {
        setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // QUI potresti aggiungere la logica per creare il documento in `utenti_master`
    } catch (err) {
        if (err instanceof FirebaseError) {
            setError(err.code || err.message);
        } else {
            setError('An unexpected error occurred.');
        }
    } finally {
        setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        if (err instanceof FirebaseError) {
            setError(err.code || err.message);
        } else {
            setError('An unexpected error occurred.');
        }
    } finally {
        setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
        await signOut(auth);
        setCurrentUser(null); // Pulisce lo stato dell'utente
        setUserRole(null); // Pulisce il ruolo
    } catch (err) { 
        if (err instanceof FirebaseError) {
            setError(err.code || err.message);
        } else {
            setError('An unexpected error occurred.');
        }
    } finally {
        setLoading(false);
    }
  }, []);

  const isAdmin = userRole === 'admin';

  const value = useMemo(() => ({ 
    user: currentUser,
    loading, 
    error, 
    login, 
    signup,
    loginWithGoogle, 
    logout,
    // Nuovi valori disponibili nel contesto
    userRole,
    isAdmin,
  }), [currentUser, loading, error, login, signup, loginWithGoogle, logout, userRole, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};