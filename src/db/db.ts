import Dexie, { Table } from 'dexie';
import type { 
    Rapportino, 
    EventoGiornaliero, 
    Tecnico, 
    Nave, 
    Luogo, 
    Cliente, 
    Categoria, 
    Ditta, 
    TipoGiornata, 
    Veicolo,
    Notifica, 
    UserProfile
} from '../models/definitions';

export interface SyncStatus {
    id: string;
    value: any;
}

export class MySubClassedDexie extends Dexie {
  // --- Tabelle Principali ---
  eventi!: Table<EventoGiornaliero>;
  notifiche!: Table<Notifica>;
  user_profile!: Table<UserProfile>;

  // --- Tabelle Anagrafiche ---
  tecnici!: Table<Tecnico>;
  navi!: Table<Nave>;
  luoghi!: Table<Luogo>;
  clienti!: Table<Cliente>;
  categorie!: Table<Categoria>;
  ditte!: Table<Ditta>;
  tipiGiornata!: Table<TipoGiornata>;
  veicoli!: Table<Veicolo>;

  // --- Tabella di Sistema ---
  sync_status!: Table<SyncStatus>;

  // --- Tabella Legacy (mantenuta per la migrazione) ---
  rapportini!: Table<Rapportino>;

  constructor() {
    super('gestionaleLavoro');

    // La versione 2 introduce lo schema unificato del piano di recupero.
    // Questo forza la migrazione e pulizia del DB sui client.
    this.version(2).stores({
      // Nuove tabelle e indici
      eventi: 'id, dataInizio, tecnicoId, isDirty', 
      notifiche: 'id, read, createdAt',
      user_profile: 'uid',

      // Anagrafiche (ridefinite per chiarezza)
      tecnici: 'id, nome, cognome, attivo',
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome',
      clienti: 'id, nome',
      categorie: 'id, nome',
      ditte: 'id, nome',
      tipiGiornata: 'id, nome',
      veicoli: 'id, nome',
      
      // Sistema
      sync_status: 'id',

      // Legacy (la tabella 'rapportini' viene mantenuta per una migrazione graduale se necessario)
      // Le tabelle 'qualifiche' e 'checkins' sono state rimosse.
      rapportini: 'id, data, tecnicoId' 
    });
  }
}

export const db = new MySubClassedDexie();

/**
 * Funzione di utilità per inserire o aggiornare in blocco dati in una tabella.
 * @param tableName Il nome della tabella.
 * @param data L'array di oggetti da inserire/aggiornare.
 */
export const bulkPutGeneric = async (tableName: string, data: any[]) => {
  if (!tableName || !Array.isArray(data) || data.length === 0) {
    return;
  }
  try {
    await db.table(tableName).bulkPut(data);
    console.log(`[bulkPut] ${data.length} record inseriti/aggiornati in ${tableName}.`);
  } catch (error) {
    console.error(`Errore durante l'operazione di bulkPut sulla tabella '${tableName}':`, error);
  }
};
