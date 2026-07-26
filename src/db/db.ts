
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
  sync_status!: Table<SyncStatus>; // CORREZIONE: Tabella aggiunta e tipizzata

  constructor() {
    super('gestionaleLavoro');
    // AGGIORNAMENTO: Versione 6 per la modifica dello schema (impostazioni -> sync_status)
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
      sync_status: 'id' // CORREZIONE: rinominata da 'impostazioni' a 'sync_status'
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
