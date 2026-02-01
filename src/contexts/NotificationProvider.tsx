import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { NotificationContext, NotificationContextType } from './NotificationContext';
import type { Notifica } from '@/models/definitions';
import { useAuth } from './AuthContext'; // <-- 1. IMPORTATO useAuth

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // <-- 2. OTTENGO LO STATO DI AUTENTICAZIONE
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    // <-- 3. CONDIZIONI DI GUARDIA FERREE
    // Se l'autenticazione è in corso, non fare nulla.
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Se l'autenticazione è terminata e non c'è utente, resetta lo stato.
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Se l'utente è autenticato, procedi.
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

    // La funzione di pulizia viene eseguita quando l'utente si disconnette.
    return () => unsubscribe();
    
  // <-- 4. ESEGUI L'EFFETTO QUANDO CAMBIA LO STATO DELL'UTENTE
  }, [currentUser, authLoading]);

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
