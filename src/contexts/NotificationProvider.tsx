// src/contexts/NotificationProvider.tsx
import React, { useState, useEffect, createContext } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { NotificationContext } from './NotificationContext';
import { useAuth } from '@/contexts/AuthContext'; // PERCORSO CORRETTO

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'notifiche'), where("userId", "==", currentUser.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifs = [];
      querySnapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error("Errore nel fetch delle notifiche: ", error);
      setLoading(false);
    });

    // Cleanup
    return () => unsubscribe();
  }, [currentUser]);

  const value = { notifications, loading };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
