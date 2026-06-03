
import { Notifica } from '@/models/definitions';

export interface NotificationContextType {
  notifications: Notifica[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => void;
  hideNotification: (notificationId: string) => void;
}

export const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);
