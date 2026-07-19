
import Dexie, { Table } from 'dexie';
import type { Rapportino, Tecnico, Nave, Luogo, TipoGiornata, AdminUser, Cliente, Ditta, Categoria, Veicolo, Impostazioni } from '@/models/definitions';

// 1. DEFINIZIONE DELLE INTERFACCE PER LE TABELLE
export interface DirtyRapportino extends Rapportino {
  isDirty?: 0 | 1; 
}

export interface SyncQueueTask {
  id?: number; 
  entityId: string; 
  entityType: 'rapportino'; 
  timestamp: number; 
  status: 'pending' | 'failed';
  attempts: number;
}

export interface SyncStatus {
  id: string; // Es. 'lastSyncTimestamp'
  value: number; // Es. un timestamp numerico
}

// 2. CLASSE DEL DATABASE DEXIE
export class RisoDexie extends Dexie {
  rapportini!: Table<DirtyRapportino, string>;
  tecnici!: Table<Tecnico, string>;
  navi!: Table<Nave, string>;
  luoghi!: Table<Luogo, string>;
  tipiGiornata!: Table<TipoGiornata, string>;
  admins!: Table<AdminUser, string>;
  clienti!: Table<Cliente, string>;
  ditte!: Table<Ditta, string>;
  categorie!: Table<Categoria, string>;
  veicoli!: Table<Veicolo, string>;
  impostazioni!: Table<Impostazioni, string>;
  sync_queue!: Table<SyncQueueTask, number>;
  sync_status!: Table<SyncStatus, string>;

  constructor() {
    super('RisoDatabase');

    // VERSIONE 11: CORREZIONE INDICE 'data'
    // Aggiunge l'indice 'data' alla tabella rapportini per permettere le query
    // usate nella pagina di reportistica, risolvendo il bug 'KeyPath not indexed'.
    this.version(11).stores({
      rapportini: 'id, data, dataInizio, tecnicoId, isDirty, updatedAt', // <-- INDICE 'data' AGGIUNTO
      tecnici: 'id, updatedAt',
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome, clienteId',
      tipiGiornata: 'id',
      admins: 'id',
      clienti: 'id, nome',
      ditte: 'id, nome',
      categorie: 'id, nome',
      veicoli: 'id, nome',
      impostazioni: 'id',
      sync_queue: '++id, timestamp, entityId',
      sync_status: 'id',
    });

    this.version(10).stores({
      rapportini: 'id, dataInizio, tecnicoId, isDirty, updatedAt', 
      tecnici: 'id, updatedAt',
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome, clienteId',
      tipiGiornata: 'id',
      admins: 'id',
      clienti: 'id, nome',
      ditte: 'id, nome',
      categorie: 'id, nome',
      veicoli: 'id, nome',
      impostazioni: 'id',
      sync_queue: '++id, timestamp, entityId',
      sync_status: 'id',
    });
    
    this.version(7).stores({ 
      rapportini: 'id, data, tecnicoId, isDirty, updatedAt',
      tecnici: 'id, updatedAt', 
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome, clienteId',
      tipiGiornata: 'id',
      admins: 'id',
      clienti: 'id, nome',
      ditte: 'id, nome',
      categorie: 'id, nome',
      veicoli: 'id, nome',
      impostazioni: 'id',
      sync_queue: '++id, timestamp, entityId',
      sync_status: 'id', 
    });

    this.version(6).stores({
      rapportini: 'id, data, tecnicoId, isDirty',
      tecnici: 'id',
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome, clienteId',
      tipiGiornata: 'id',
      admins: 'id',
      clienti: 'id, nome',
      ditte: 'id, nome',
      categorie: 'id, nome',
      veicoli: 'id, nome',
      impostazioni: 'id', 
      sync_queue: '++id, timestamp, entityId',
    });

    this.version(5).stores({
      rapportini: 'id, data, tecnicoId, isDirty',
      tecnici: 'id',
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome, clienteId',
      tipiGiornata: 'id',
      admins: 'id',
      clienti: 'id, nome',
      ditte: 'id, nome',
      categorie: 'id, nome',
      veicoli: 'id, nome',
      sync_queue: '++id, timestamp, entityId',
    });
      
    this.version(4).stores({
      rapportini: 'id, data, tecnicoId, isDirty',
      tecnici: 'id',
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome, clienteId',
      tipiGiornata: 'id',
      admins: 'id',
      clienti: 'id, nome',
      ditte: 'id, nome',
      categorie: 'id, nome',
      veicoli: 'id, nome',
      sync_queue: '++id, timestamp, entityId',
    });
    
    this.version(3).stores({
      rapportini: 'id, data, tecnicoId, isDirty',
      tecnici: 'id', 
      navi: 'id, nome',
      luoghi: 'id, nome',
      tipiGiornata: 'id',
      admins: 'id', 
      sync_queue: '++id, timestamp, entityId',
    }).upgrade(tx => {
      return tx.table('rapportini').toCollection().modify(r => {
        if (r.isDirty === undefined) {
          r.isDirty = 0; 
        }
      });
    });

    this.version(2).stores({
        rapportini: 'id, data, tecnicoId, isDirty',
        tecnici: 'id',
        navi: 'id, nome',
        luoghi: 'id, nome',
        tipiGiornata: 'id',
        admins: 'id',
        sync_queue: '++id, timestamp, entityId',
    });
    
    this.version(1).stores({
      rapportini: 'id, data, tecnicoId',
      tecnici: 'id',
      navi: 'id',
      luoghi: 'id',
    });
  }
}

// 3. ISTANZA GLOBALE DEL DATABASE
export const db = new RisoDexie();

// 4. TIPI ESPORTATI PER ROBUSTEZZA
export type AnagraficaTable = 'tecnici' | 'navi' | 'luoghi' | 'tipiGiornata' | 'admins' | 'clienti' | 'ditte' | 'categorie' | 'veicoli' | 'impostazioni';

// Funzione di utility per popolare le anagrafiche, che sarà usata dal SyncService
export async function bulkPutAnagrafiche(data: Partial<Record<AnagraficaTable, any[]>>) {
    const tabelleDaAggiornare = Object.keys(data) as AnagraficaTable[];
    const tabelleDexie = tabelleDaAggiornare.map(nome => db[nome]).filter(t => t);

    if (tabelleDexie.length === 0) return;

    await db.transaction('rw', tabelleDexie, async () => {
      for (const nome of tabelleDaAggiornare) {
        const tabella = db[nome];
        const records = data[nome];
        if (tabella && records && records.length > 0) {
          await tabella.bulkPut(records);
        }
      }
    });
}
