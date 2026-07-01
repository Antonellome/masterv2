
import { Timestamp } from 'firebase/firestore';

export interface BaseEntity {
  id: string;
}

// --- ANAGRAFICHE PRINCIPALI ---

export interface Tecnico extends BaseEntity {
  // Dati anagrafici e di contatto
  nome: string;
  cognome: string;
  email: string;
  codiceFiscale?: string;
  telefono?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;

  // Dati aziendali e contrattuali
  attivo: boolean;          // Stato di attività del tecnico
  appAccess?: boolean;         // Permesso di accedere all'app (nuovo campo unificato)
  accessoApp?: boolean;        // Vecchio campo, mantenuto per retrocompatibilità
  dittaId?: string;
  categoriaId?: string;
  tipoContratto?: string;
  dataAssunzione?: Timestamp | Date | null;
  
  // Documenti e scadenze
  numeroCartaIdentita?: string;
  scadenzaCartaIdentita?: Timestamp | Date | null;
  numeroPatente?: string;
  categoriaPatente?: string;
  scadenzaPatente?: Timestamp | Date | null;
  numeroPassaporto?: string;
  scadenzaPassaporto?: Timestamp | Date | null;
  numeroCQC?: string;
  scadenzaCQC?: Timestamp | Date | null;
  
  // Scadenze corsi e visite
  scadenzaVisita?: Timestamp | Date | null;
  scadenzaContratto?: Timestamp | Date | null;
  scadenzaPrimoSoccorso?: Timestamp | Date | null;
  scadenzaAntincendio?: Timestamp | Date | null;
  scadenzaCorsoSicurezza?: Timestamp | Date | null;
  scadenzaUnilav?: Timestamp | Date | null;

  // Dati specifici dell'app
  uid?: string;              // UID da Firebase Auth, se associato
  fcmToken?: string;         // Token per le notifiche push
  tariffe?: Record<string, number>; // Mappa dinamica per le tariffe personalizzate
  note?: string;

  // Campi legacy o di stato
  sincronizzazioneAttiva?: boolean;
  dataSync?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
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

export interface Categoria extends BaseEntity {
  nome: string;
}

export interface Ditta extends BaseEntity {
  nome: string;
  // altri campi se necessari
}

// --- ANAGRAFICHE DI SUPPORTO ---

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

// --- DATI OPERATIVI ---

export interface DettaglioOreTecnico {
  tecnicoId: string;
  ore: number;
}

export interface Rapportino extends BaseEntity {
  data: any; // O Timestamp
  userId: string;
  tecnicoId: string;
  presenze?: string[];
  dettaglioOreTecnici?: DettaglioOreTecnico[];
  naveId: string;
  luogoId: string;
  veicoloId: string;
  oreLavoro?: number;
  tipoGiornataId: string;
  isTrasferta?: boolean;
  trasfertaId?: string;
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

// --- IMPOSTAZIONI E PROFILI ---

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
  ditte: Ditta[];
}

// --- REPORTISTICA ---

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

// --- NOTIFICHE ---

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

// --- TIPI GENERICI ---
// Necessario per GestioneAnagrafica
export type Anagrafica = Cliente | Tecnico | Categoria | Ditta | Nave | Luogo | Veicolo | TipoGiornata;

// Necessario per FormDialog
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'date' | 'boolean' | 'password';
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}
