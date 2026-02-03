import { useNotifications, NotificationContextType } from '@/contexts/NotificationContext';

// Riesportiamo il tipo per risolvere l'errore TS4023
export type { NotificationContextType };

export const useAvvisi = () => {
  return useNotifications();
};
