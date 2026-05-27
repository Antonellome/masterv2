
import { Timestamp } from 'firebase/firestore';

// Definizione per un Tecnico (CORRETTA - senza il campo 'ruolo')
export interface Tecnico {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  abilitato: boolean;
  categoria?: string;
}

// Definizione per un Rapportino come salvato in Firestore
export interface Rapportino {
  id: string;
  tecnicoId: string;
  data: Timestamp; // In Firestore, la data è un Timestamp
  tipoGiornataId: string;
  oreLavorate: number;
  oreViaggio: number;
  km: number;
  note: string;
  commesse: { commessaId: string; ore: number }[];
}

// Definizione per un Rapportino "arricchito" lato client
// La vostra app Tecnici converte il Timestamp in Date, quindi questo tipo è corretto per voi
export interface EnrichedRapportino extends Omit<Rapportino, 'data'> {
  data: Date; // In JavaScript, dopo la conversione, è un Date
  isEditable: boolean;
  tipoGiornata: any; 
  commesseDettagliate: any[]; 
}

// Altre definizioni...
export interface TipoGiornata {
  id: string;
  nome: string;
}

export interface Commessa {
    id: string;
    codice: string;
    descrizione: string;
}

// Definizione di una Notifica come generata dall'app Master
export interface AppNotification {
    id: string;
    title: string;
    message: string;
    createdAt: Timestamp;
    status: 'read' | 'unread';
    target: {
        type: 'user' | 'category' | 'all';
        id: string;
        name: string;
    };
    readAt?: Timestamp;
    readBy?: string;
}
