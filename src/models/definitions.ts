
// Definizione per un Tecnico
export interface Tecnico {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    abilitato: boolean;
    categoria?: string; // La categoria è opzionale
  }
  
  // Definizione per una Notifica
  export interface Notifica {
    id: string;
    title: string;
    message: string;
    recipientId: string;
    createdAt: any; // O un tipo più specifico se usi `Timestamp` di Firebase
    status: 'read' | 'unread';
    readAt?: any;
    readBy?: string;
  }

  // Definizione per il target di una notifica
  export type NotificationTarget = {
    type: 'user' | 'category' | 'all';
    id: string;
    name: string; // Nome per la visualizzazione (es. "Mario Rossi" o "Categoria: Elettricisti")
  }
  