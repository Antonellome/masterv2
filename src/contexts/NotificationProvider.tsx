// src/contexts/NotificationProvider.tsx
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthProvider'; // MODIFICATO: Percorso corretto

interface INotificationContext {
  notifications: any[]; // Sostituire any con un tipo specifico se disponibile
  loading: boolean;
}

// Creazione del contesto con un valore di default
export const NotificationContext = createContext<INotificationContext | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications deve essere utilizzato all'interno di un NotificationProvider");
    }
    return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Adesso usiamo `user` invece di `currentUser` per coerenza con AuthProvider
  const { user } = useAuth(); 

  useEffect(() => {
    // Se non c'è utente, svuota le notifiche e ferma il caricamento
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // La query usa l'UID dell'utente per trovare le notifiche pertinenti
    const q = query(collection(db, 'notifiche'), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifs: any[] = [];
      querySnapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error("Errore nel fetch delle notifiche: ", error);
      setLoading(false);
    });

    // Funzione di pulizia per annullare la sottoscrizione quando il componente si smonta o l'utente cambia
    return () => unsubscribe();
  }, [user]); // L'effetto dipende dall'oggetto `user`

  const value = { notifications, loading };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};