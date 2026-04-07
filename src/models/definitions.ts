
import { Timestamp } from 'firebase/firestore';

// Definisce la struttura per il documento Tecnico nella collezione 'tecnici'
export interface Tecnico {
  id: string;
  nome: string;
  cognome: string;
  attivo: boolean;
  email?: string; 
  userId?: string; 
}

// Definisce la struttura per il documento Rapportino nella collezione 'rapportini'
export interface Rapportino {
  id: string;
  data: Timestamp;
  giornata: string;
  note?: string;
  oreLavorate: number;
  salvatoDa?: string;
  tecnicoScrivente: {
    id: string;
    nome: string;
  };
  tecniciAggiunti?: {
    id: string;
    nome: string;
  }[];
}

// Definisce la struttura per il documento Checkin nella collezione 'checkin_giornalieri'
export interface Checkin {
  id: string;
  tecnicoId: string;
  tecnicoNome: string;
  anagraficaId: string;
  anagraficaNome: string;
  timestamp: Timestamp;
}

// Definisce la struttura per il documento Anagrafica nella collezione 'anagrafiche'
export interface Anagrafica {
  id: string;
  nome: string;
  tipo: 'nave' | 'luogo'; 
}
