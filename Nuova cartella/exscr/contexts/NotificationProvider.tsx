import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { NotificationContext, NotificationContextType } from './NotificationContext';
import type { Notifica } from '@/models/definitions';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'notifiche'), orderBy('data', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Notifica));
      setNotifications(notificationsData);
      setLoading(false);
    }, (err) => {
      console.error("Errore durante il recupero delle notifiche:", err);
      setError(err);
      setLoading(false);
    });

    // Pulizia dell'observer quando il componente si smonta
    return () => unsubscribe();
  }, []);

  const value: NotificationContextType = {
    notifications,
    loading,
    error,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
