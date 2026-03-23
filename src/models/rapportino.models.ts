import { TecnicoLite } from './user.models';

/**
 * @file Definisce il modello di dati per il nuovo Rapportino di Intervento Unico.
 */

/**
 * Rappresenta l'intestazione di un rapportino.
 * Contiene i dati principali e immutabili dell'intervento.
 */
export interface RapportinoHeader {
  id: string; // ID univoco del rapportino
  numero: string; // Numero progressivo (es. 2024-001)
  dataIntervento: number; // Timestamp Unix
  
  // Riferimenti alle anagrafiche (solo ID)
  idCliente: string;
  idDestinazione: string;

  // Informazioni sul cliente e destinazione (denormalizzate per facile accesso)
  clienteNome: string;
  destinazioneNome: string;
  destinazioneIndirizzo: string;
}

/**
 * Rappresenta un singolo intervento o attività all'interno di un rapportino.
 * Ogni rapportino può avere più interventi.
 */
export interface Intervento {
  id: string; // ID univoco dell'intervento
  descrizione: string;
  oreLavorate: number;
  tecnico: TecnicoLite; // Oggetto TecnicoLite denormalizzato
  materialiUtilizzati?: { nome: string; quantita: number }[];
}

/**
 * Rappresenta la firma apposta sul rapportino.
 */
export interface Firma {
  nomeCliente: string;
  firmaUrl: string; // URL all'immagine della firma in Firebase Storage
  timestamp: number;
}


/**
 * Rappresenta il documento completo del Rapportino di Intervento Unico.
 * Questo modello unifica tutte le informazioni in un singolo documento,
 * che sarà salvato in una collezione dedicata `rapportini`.
 */
export interface RapportinoUnico {
  header: RapportinoHeader;
  interventi: Intervento[];
  noteFinali?: string;
  firma?: Firma;
  stato: 'aperto' | 'chiuso' | 'annullato';
  
  // Array degli ID dei tecnici che hanno partecipato all'intervento
  // Utile per le query e le regole di sicurezza (es. "può leggere se il mio ID è in questo array")
  partecipanti: string[]; 
}
