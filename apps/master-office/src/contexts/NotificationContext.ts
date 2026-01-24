import { createContext, useContext } from 'react';
import type { Notifica } from '@/models/definitions';

// Definiamo e ESPORTIAMO l'interfaccia per il nostro contesto
export interface NotificationContextType {
    notifications: Notifica[];
    loading: boolean;
    error: Error | null;
}

// Creiamo il contesto
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Creiamo e esportiamo l'hook per utilizzare il contesto
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
