
import Dexie, { Table } from 'dexie';
import type { Rapportino, Tecnico, Nave, Luogo, Cliente, Categoria, Ditta, Impostazioni, TipoGiornata, Qualifica, Veicolo, Checkin } from '../models/definitions';

// Definiamo l'interfaccia per le tabelle di anagrafica generiche.
export interface AnagraficaTable {
  id: string;
  nome: string;
  [key: string]: any;
}

// Interfaccia per la tabella di stato della sincronizzazione
export interface SyncStatus {
    id: string; // Es. 'lastSyncTimestamp'
    value: any;
}

export class MySubClassedDexie extends Dexie {
  rapportini!: Table<Rapportino>;
  tecnici!: Table<Tecnico>;
  navi!: Table<Nave>;
  luoghi!: Table<Luogo>;
  clienti!: Table<Cliente>;
  categorie!: Table<Categoria>;
  ditte!: Table<Ditta>;
  tipiGiornata!: Table<TipoGiornata>;
  qualifiche!: Table<Qualifica>;
  veicoli!: Table<Veicolo>;
  checkins!: Table<Checkin>;
  sync_status!: Table<SyncStatus>;

  constructor() {
    super('gestionaleLavoro');
    // HARD RESET DEL DATABASE: Definiamo una singola versione.
    // Questo cancellerà il DB esistente se non corrisponde a questa struttura,
    // risolvendo i problemi di corruzione dei dati precedenti.
    this.version(1).stores({
      rapportini: 'id, data, tecnicoId, naveId, clienteId, isDirty',
      tecnici: 'id, nome, cognome, attivo, isDirty',
      navi: 'id, nome, clienteId, isDirty',
      luoghi: 'id, nome, isDirty',
      clienti: 'id, nome, isDirty',
      categorie: 'id, nome, isDirty',
      ditte: 'id, nome, isDirty',
      tipiGiornata: 'id, nome, isDirty',
      qualifiche: 'id, nome, isDirty',
      veicoli: 'id, nome, isDirty',
      checkins: 'id, tecnicoId, anagraficaId, data, tipo',
      sync_status: 'id'
    });
  }
}

export const db = new MySubClassedDexie();

/**
 * Funzione di utilità per inserire o aggiornare in blocco dati in una tabella anagrafica.
 * @param tableName Il nome della tabella.
 * @param data L'array di oggetti da inserire/aggiornare.
 */
export const bulkPutAnagrafiche = async (tableName: string, data: any[]) => {
  if (!tableName || !Array.isArray(data) || data.length === 0) {
    return;
  }
  try {
    await db.table(tableName).bulkPut(data);
  } catch (error) {
    console.error(`Errore durante l'operazione di bulkPut sulla tabella '${tableName}':`, error);
  }
};

/**
 * Funzione di utilità per inserire o aggiornare in blocco i rapportini.
 * @param data L'array di rapportini da inserire/aggiornare.
 */
export const bulkPutRapportini = async (data: Rapportino[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    return;
  }
  try {
    await db.rapportini.bulkPut(data);
  } catch (error) {
    console.error(`Errore durante l'operazione di bulkPut sulla tabella 'rapportini':`, error);
  }
};

