
import { Timestamp } from 'firebase/firestore';

export interface BaseEntity {
  id: string;
}

export interface Cliente extends BaseEntity {
  nome: string;
  indirizzo?: string;
  citta?: string;
  piva?: string;
  codiceFiscale?: string;
  email?: string;
  telefono?: string;
}

export interface Tecnico extends BaseEntity {
  nome: string;
  cognome: string;
  email: string;
  userId: string;
  costoOrarioOrdinario?: number;
  costoOrarioStraordinario?: number;
  costoTrasferta?: number;
}

export interface TipoGiornata extends BaseEntity {
  nome: string;
  categoria?: 'ordinaria' | 'straordinario' | 'trasferta' | 'special';
  colore: string;
  costo: number;
  unita: 'h' | 'g';
}

export interface Nave extends BaseEntity {
  nome: string;
  clienteId: string;
}

export interface Luogo extends BaseEntity {
  nome: string;
}

export interface Veicolo extends BaseEntity {
  nome: string;
}

export interface Categoria extends BaseEntity {
  nome: string;
}

export interface DettaglioOreTecnico {
  tecnicoId: string;
  ore: number;
}

export interface Rapportino extends BaseEntity {
  data: any; // O Timestamp
  userId: string;
  tecnicoId: string; // Tecnico principale
  presenze?: string[]; // ID dei tecnici presenti
  dettaglioOreTecnici?: DettaglioOreTecnico[];
  naveId: string;
  luogoId: string;
  veicoloId: string;
  oreLavoro?: number;
  tipoGiornataId: string;
  isTrasferta?: boolean; // Vecchio campo
  trasfertaId?: string; // Nuovo campo
  note?: string;
  approvato: boolean;
  firmaVettoriale?: string;
  orarioIngresso?: string;
  orarioUscita?: string;
}

export interface EnrichedRapportino extends Rapportino {
  dataFormatted: string;
  tipoGiornata?: TipoGiornata;
  tipoGiornataNome: string;
  naveNome: string;
  luogoNome: string;
  oreGiorno: number;
  oreOrdinarie: number;
  oreStraordinarie: number;
  isEditable?: boolean;
}


export interface Impostazioni extends BaseEntity {
    tariffe: {
        tipoGiornataId: string;
        costo: number;
        unita: 'h' | 'g';
    }[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  nome: string | null;
  cognome: string | null;
  isAdmin: boolean;
  isTecnico: boolean;
  tecnicoId: string | null;
}

export interface MasterData {
  clienti: Cliente[];
  tecnici: Tecnico[];
  tipiGiornata: TipoGiornata[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
  categorie: Categoria[];
}

export interface RiepilogoVoce {
  id: string;
  nome: string;
  colore: string;
  unita: 'h' | 'g';
  oreTotali: number;
  giorni: number;
  costo: number;
  giorniSet?: Set<string>;
}

export interface RiepilogoMese {
  dettaglio: Map<string, RiepilogoVoce>;
  oreTotali: number;
  oreOrdinarie: number;
  oreStraordinarie: number;
  giorniTotaliLavorati: number;
  giorniTrasferta: number;
  costoTotale: number;
}

export interface NotificationTarget {
    type: 'user' | 'category' | 'all';
    id: string;
    name: string;
}

export interface NotificaInviata extends BaseEntity {
  title: string;
  body: string;
  sentAt: Timestamp;
  target: NotificationTarget;
  recipientsCount: number;
  fcmMessageId: string;
  batchId?: string;
}
