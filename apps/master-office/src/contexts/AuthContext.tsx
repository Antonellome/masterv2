import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export type UserRole = 'admin' | 'user';

// Definizione di un tipo specifico per i dati dell'utente
interface UserData {
  nome: string;
  cognome: string;
  ruolo: UserRole;
  // Aggiungi altri campi se necessario
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null; // Usa il tipo specifico
  userRole: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null); // Stato con tipo specifico
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const userDocRef = doc(db, 'utenti_master', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data() as UserData; // Esegui il cast al tipo specifico
                    setUserData(data);
                    setUserRole(data.ruolo || 'user');
                } else {
                    setUserData(null);
                    setUserRole('user'); 
                }
            } else {
                setUserData(null);
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const isAdmin = userRole === 'admin';

    const value = {
        currentUser,
        userData,
        userRole,
        loading,
        isAdmin,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve essere utilizzato all\'interno di un AuthProvider');
    }
    return context;
};
