
// src/db/db.ts
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
  // Dichiarazione delle tabelle per l'autocompletamento e la type-safety.
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
    // AGGIORNAMENTO: Versione 7 per aggiungere l'indice 'isDirty' a tutte le anagrafiche.
    this.version(7).stores({
      rapportini: 'id, data, tecnicoId, naveId, luogoId, clienteId, isDirty',
      tecnici: 'id, nome, cognome, categoriaId, attivo, isDirty', // INDICE AGGIUNTO
      navi: 'id, nome, clienteId, isDirty', // INDICE AGGIUNTO
      luoghi: 'id, nome, isDirty', // INDICE AGGIUNTO
      clienti: 'id, nome, isDirty', // INDICE AGGIUNTO
      categorie: 'id, nome, isDirty', // INDICE AGGIUNTO
      ditte: 'id, nome, isDirty', // INDICE AGGIUNTO
      tipiGiornata: 'id, nome, isDirty', // INDICE AGGIUNTO
      qualifiche: 'id, nome, isDirty', // INDICE AGGIUNTO
      veicoli: 'id, nome, isDirty', // INDICE AGGIUNTO
      checkins: 'id, tecnicoId, anagraficaId, data, tipo',
      sync_status: 'id'
    });
    
    // Manteniamo la versione precedente per la migrazione
    this.version(6).stores({
      rapportini: 'id, data, tecnicoId, naveId, luogoId, clienteId, isDirty',
      tecnici: 'id, nome, cognome, categoriaId, attivo',
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome',
      clienti: 'id, nome',
      categorie: 'id, nome',
      ditte: 'id, nome',
      tipiGiornata: 'id, nome',
      qualifiche: 'id, nome',
      veicoli: 'id, nome',
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
    return; // Salta se non ci sono dati o il nome della tabella non è valido
  }
  try {
    await db.table(tableName).bulkPut(data);
  } catch (error) {
    console.error(`Errore durante l'operazione di bulkPut sulla tabella '${tableName}':`, error);
  }
};
