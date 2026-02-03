import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

// Creiamo e esportiamo l'hook personalizzato
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications deve essere usato all\'interno di un NotificationProvider');
    }
    return context;
};
