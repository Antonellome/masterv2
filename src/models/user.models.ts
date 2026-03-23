/**
 * @file Definisce i modelli di dati per utenti e tecnici, secondo la nuova architettura.
 */

// --- Modelli per App MASTER ---

/**
 * Rappresenta il profilo completo di un tecnico nell'app Master.
 * Contiene tutte le informazioni anagrafiche, contatti, e dettagli.
 */
export interface TecnicoMaster {
  id: string; // Firebase Auth UID
  nome: string;
  cognome: string;
  codiceFiscale: string;
  email: string;
  telefono: string;
  qualifica: string;
  livello: string;
  note?: string;
  attivo: boolean;
  // ...altri campi specifici per la gestione interna
}

/**
 * Rappresenta un utente Amministratore nell'app Master.
 */
export interface AdminMaster {
  id: string; // Firebase Auth UID
  nome: string;
  email: string;
  ruolo: 'admin' | 'super-admin';
}


// --- Modelli per App TECNICI (Lite) ---

/**
 * Rappresenta la versione "leggera" del profilo di un tecnico.
 * Contiene solo le informazioni strettamente necessarie per l'app dei tecnici,
 * ottimizzando le letture da Firestore.
 */
export interface TecnicoLite {
  id: string; // Firebase Auth UID
  nome: string;
  qualifica: string;
}
