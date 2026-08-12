
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
    UserProfile,
    Cantiere,
    Documento
} from '../models/definitions';

export interface SyncStatus {
    id: string;
    value: any;
}

// Nomi delle tabelle allineati con Firestore
export class MySubClassedDexie extends Dexie {
  eventi!: Table<EventoGiornaliero>;
  notifiche!: Table<Notifica>;
  user_profile!: Table<UserProfile>;
  tecnici!: Table<Tecnico>;
  navi!: Table<Nave>;
  luoghi!: Table<Luogo>;
  clienti!: Table<Cliente>;
  categorie!: Table<Categoria>;
  ditte!: Table<Ditta>;
  tipiGiornata!: Table<TipoGiornata>;
  veicoli!: Table<Veicolo>;
  cantieri!: Table<Cantiere>;
  sync_status!: Table<SyncStatus>;
  rapportini!: Table<Rapportino>;
  documenti!: Table<Documento>;

  constructor() {
    super('gestionaleLavoro');

    this.version(7).stores({
      eventi: 'id, dataInizio, tecnicoId, isDirty, tipo',
      notifiche: 'id, read, createdAt',
      user_profile: 'uid',
      tecnici: 'id, nome, cognome, attivo, isDirty',
      navi: 'id, nome, clienteId, isDirty',
      luoghi: 'id, nome, isDirty',
      clienti: 'id, nome, isDirty',
      categorie: 'id, nome, isDirty',
      ditte: 'id, nome, isDirty',
      tipiGiornata: 'id, nome, isDirty',
      veicoli: 'id, nome, isDirty',
      cantieri: 'id, nome, clienteId, isDirty',
      sync_status: 'id',
      rapportini: 'id, data, tecnicoId, isDirty',
      documenti: 'id, nome, tecnicoId, isDirty'
    });

    this.version(6).stores({
      eventi: 'id, dataInizio, tecnicoId, isDirty, tipo',
      notifiche: 'id, read, createdAt',
      user_profile: 'uid',
      tecnici: 'id, nome, cognome, attivo, isDirty',
      navi: 'id, nome, clienteId, isDirty',
      luoghi: 'id, nome, isDirty',
      clienti: 'id, nome, isDirty',
      categorie: 'id, nome, isDirty',
      ditte: 'id, nome, isDirty',
      tipiGiornata: 'id, nome, isDirty',
      veicoli: 'id, nome, isDirty',
      cantieri: 'id, nome, clienteId, isDirty',
      sync_status: 'id',
      rapportini: 'id, data, tecnicoId, isDirty'
    });

    this.version(5).stores({
        eventi: 'id, dataInizio, tecnicoId, isDirty, tipo',
        notifiche: 'id, read, createdAt',
        user_profile: 'uid',
        tecnici: 'id, nome, cognome, attivo',
        navi: 'id, nome, clienteId',
        luoghi: 'id, nome',
        clienti: 'id, nome',
        categorie: 'id, nome',
        ditte: 'id, nome',
        tipigiornata: 'id, nome',
        veicoli: 'id, nome',
        cantieri: 'id, nome, clienteId',
        sync_status: 'id',
        rapportini: 'id, data, tecnicoId, isDirty'
    });
    
    this.version(4).stores({
      eventi: 'id, dataInizio, tecnicoId, isDirty, tipo',
      notifiche: 'id, read, createdAt',
      user_profile: 'uid',
      tecnici: 'id, nome, cognome, attivo',
      navi: 'id, nome, clienteId',
      luoghi: 'id, nome',
      clienti: 'id, nome',
      categorie: 'id, nome',
      ditte: 'id, nome',
      tipiGiornata: 'id, nome',
      veicoli: 'id, nome',
      cantieri: 'id, nome, clienteId',
      sync_status: 'id',
      rapportini: 'id, data, tecnicoId' 
    });
  }
}

export const db = new MySubClassedDexie();

export const bulkPutGeneric = async (tableName: string, data: any[]) => {
  if (!tableName || !Array.isArray(data) || data.length === 0) {
    return;
  }
  try {
    await db.table(tableName).bulkPut(data);
  } catch (error) {
    console.error(`Errore durante l'operazione di bulkPut sulla tabella '${tableName}':`, error);
    throw error;
  }
};

export const loadAllData = async () => {
  try {
    const [
      tecnici,
      clienti,
      veicoli,
      cantieri,
      ditte,
      tipiGiornata, // <-- AGGIUNTO ANCHE QUI
      luoghi,
      navi,
      categorie,
      rapportini,
      syncStatus,
      checkins,
      documenti
    ] = await db.transaction('r', db.tables, async () => {
      const anagrafichePromises = [
        db.tecnici.toArray(),
        db.clienti.toArray(),
        db.veicoli.toArray(),
        db.cantieri.toArray(),
        db.ditte.toArray(),
        db.tipiGiornata.toArray(), // <-- AGGIUNTO QUI
        db.luoghi.toArray(),
        db.navi.toArray(),
        db.categorie.toArray(),
      ];
      const rapportiniPromise = db.rapportini.toArray();
      const syncStatusPromise = db.sync_status.get('lastFullSync');
      const checkinsPromise = db.eventi.where({ tipo: 'checkin' }).toArray();
      const documentiPromise = db.documenti.toArray();

      const results = await Promise.all([...anagrafichePromises, rapportiniPromise, syncStatusPromise, checkinsPromise, documentiPromise]);
      return results;
    });

    const anagrafiche = {
      tecnici,
      clienti,
      veicoli,
      cantieri,
      ditte,
      tipiGiornata, // <-- AGGIUNTO QUI
      luoghi,
      navi,
      categorie,
    };
    
    const lastUpdated = syncStatus?.value ? new Date(syncStatus.value) : null;

    return {
      anagrafiche,
      rapportini,
      checkins,
      documenti,
      lastUpdated,
    };
  } catch (error) {
    console.error('[loadAllData] Errore critico durante il caricamento dei dati da IndexedDB:', error);
    return {
      anagrafiche: { tecnici: [], clienti: [], veicoli: [], cantieri: [], ditte: [], tipiGiornata: [], luoghi: [], navi: [], categorie: [] },
      rapportini: [],
      checkins: [],
      documenti: [],
      lastUpdated: null,
    };
  }
};
