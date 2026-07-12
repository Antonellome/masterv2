
import { Timestamp } from 'firebase/firestore';

export interface BaseEntity {
  id: string;
}

// --- ANAGRAFICHE PRINCIPALI ---

export interface Tecnico extends BaseEntity {
  nome: string;
  cognome: string;
  email: string;
  codiceFiscale?: string;
  telefono?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  attivo: boolean;
  appAccess?: boolean;
  accessoApp?: boolean;
  dittaId?: string;
  categoriaId?: string;
  tipoContratto?: string;
  dataAssunzione?: Timestamp | Date | null;
  numeroCartaIdentita?: string;
  scadenzaCartaIdentita?: Timestamp | Date | null;
  numeroPatente?: string;
  categoriaPatente?: string;
  scadenzaPatente?: Timestamp | Date | null;
  numeroPassaporto?: string;
  scadenzaPassaporto?: Timestamp | Date | null;
  numeroCQC?: string;
  scadenzaCQC?: Timestamp | Date | null;
  scadenzaVisita?: Timestamp | Date | null;
  scadenzaContratto?: Timestamp | Date | null;
  scadenzaPrimoSoccorso?: Timestamp | Date | null;
  scadenzaAntincendio?: Timestamp | Date | null;
  scadenzaCorsoSicurezza?: Timestamp | Date | null;
  scadenzaUnilav?: Timestamp | Date | null;
  uid?: string;
  fcmToken?: string;
  tariffe?: Record<string, number>;
  note?: string;
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
  clienteId?: string; // CORREZIONE STRUTTURALE: Aggiunto clienteId opzionale
}

export interface Veicolo extends BaseEntity {
  nome: string;
}

// --- DATI OPERATIVI (STRUTTURA UNIFICATA POST-COMPATIBILITÀ) ---

export interface DettaglioOre {
  tecnicoId: string;
  oraInizio?: string | null;
  oraFine?: string | null;
  ore?: number;
  isManual?: boolean;
}

export interface Rapportino extends BaseEntity {
  // --- CAMPI FONDAMENTALI ---
  dataInizio: Timestamp | Date;
  dataFine?: Timestamp | Date | null;
  tecnicoId: string;
  presenze: string[];
  tipoGiornataId: string;
  includeTrasferta: boolean;
  trasfertaId?: string | null;

  // --- DETTAGLI INTERVENTO ---
  naveId?: string | null;
  luogoId?: string | null;
  veicoloId?: string | null;
  ordineLavoro?: string | null;
  descrizioneBreve?: string | null;
  lavoroEseguito: string;
  materialiImpiegati?: string | null;

  // --- DETTAGLIO ORE ---
  dettaglioOre: DettaglioOre[];

  // --- FIRMA ---
  firmaFirmatarioNome?: string | null;
  firmaFirmatarioSocieta?: string | null;
  firmaVettoriale?: string | null;

  // --- METADATI DI SISTEMA ---
  createdAt: Timestamp | Date;
  createdBy: string;
  updatedAt: Timestamp | Date;
  updatedBy: string;
  isLocked: boolean;
  version: number;
  
  // --- CAMPO PER SINCRONIZZAZIONE LOCALE ---
  isDirty?: 1 | 0;

  // --- CAMPI LEGACY (da rimuovere in futuro) ---
  approvato?: boolean;
  note?: string;
  oreLavoro?: number;
  data?: any; // Mantenuto temporaneamente per la migrazione
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
export type Anagrafica = Cliente | Tecnico | Categoria | Ditta | Nave | Luogo | Veicolo | TipoGiornata;

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'date' | 'boolean' | 'password';
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}
