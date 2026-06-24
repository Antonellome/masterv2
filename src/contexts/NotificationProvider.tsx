
// src/contexts/NotificationProvider.tsx
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthProvider';

interface INotification {
  id: string;
  [key: string]: any; // Allow other properties
}

interface INotificationContext {
  notifications: INotification[];
  loading: boolean;
}

export const NotificationContext = createContext<INotificationContext | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications deve essere utilizzato all'interno di un NotificationProvider");
    }
    return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Filtra per destinatario e ordina in memoria per evitare dipendenze da indici compositi
    const q = query(
      collection(db, 'notifications'), 
      where("recipientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifs = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as INotification))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error("Errore nel fetch delle notifiche: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const value = { notifications, loading };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
