
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
    Documento,
    Checkin // <-- Importo la definizione corretta
} from '../models/definitions';

export interface SyncStatus {
    id: string;
    value: any;
}

// Nomi delle tabelle allineati con Firestore
export class MySubClassedDexie extends Dexie {
  eventi_giornalieri!: Table<EventoGiornaliero>;
  checkin_giornalieri!: Table<Checkin>; // <-- Aggiungo la tabella mancante
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

    // VERSIONE 9: Aggiunta tabella checkin_giornalieri per fixare crash pagina presenze
    this.version(9).stores({
        checkin_giornalieri: 'id, tecnicoId, timestampReale, tipo'
        // Dexie copia automaticamente le definizioni dalla versione precedente
    })

    // VERSIONE 8: Aggiunta la nuova tabella eventi_giornalieri
    this.version(8).stores({
      eventi_giornalieri: 'id, tecnicoId, timestampReale, tipo', // <-- DEFINIZIONE NUOVA TABELLA
      // Le altre tabelle rimangono invariate, quindi Dexie le copierà dalla versione precedente
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

    this.version(7).stores({
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
    }).upgrade(tx => {
      return tx.table('eventi').clear();
    });
    
    this.version(6).stores({});
    this.version(5).stores({});
    this.version(4).stores({});
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

// Funzione di caricamento dati da aggiornare per includere la nuova tabella
export const loadAllData = async () => {
  try {
    const [
      tecnici,
      clienti,
      veicoli,
      cantieri,
      ditte,
      tipiGiornata,
      luoghi,
      navi,
      categorie,
      rapportini,
      eventiGiornalieri, 
      checkinGiornalieri, // <-- CARICA ANCHE I NUOVI DATI
      documenti,
      syncStatus
    ] = await db.transaction('r', db.tables, async () => {
      const anagrafichePromises = [
        db.tecnici.toArray(),
        db.clienti.toArray(),
        db.veicoli.toArray(),
        db.cantieri.toArray(),
        db.ditte.toArray(),
        db.tipiGiornata.toArray(),
        db.luoghi.toArray(),
        db.navi.toArray(),
        db.categorie.toArray(),
      ];
      const rapportiniPromise = db.rapportini.toArray();
      const eventiGiornalieriPromise = db.eventi_giornalieri.toArray();
      const checkinGiornalieriPromise = db.checkin_giornalieri.toArray(); // <-- CARICA DALLA NUOVA TABELLA
      const documentiPromise = db.documenti.toArray();
      const syncStatusPromise = db.sync_status.get('lastFullSync');

      const results = await Promise.all([...anagrafichePromises, rapportiniPromise, eventiGiornalieriPromise, checkinGiornalieriPromise, documentiPromise, syncStatusPromise]);
      return results;
    });

    const anagrafiche = {
      tecnici,
      clienti,
      veicoli,
      cantieri,
      ditte,
      tipiGiornata,
      luoghi,
      navi,
      categorie,
    };
    
    const lastUpdated = syncStatus?.value ? new Date(syncStatus.value) : null;

    return {
      anagrafiche,
      rapportini,
      eventiGiornalieri, 
      checkinGiornalieri, // <-- RESTITUISCI I NUOVI DATI
      documenti,
      lastUpdated,
    };
  } catch (error) {
    console.error('[loadAllData] Errore critico durante il caricamento dei dati da IndexedDB:', error);
    return {
      anagrafiche: { tecnici: [], clienti: [], veicoli: [], cantieri: [], ditte: [], tipiGiornata: [], luoghi: [], navi: [], categorie: [] },
      rapportini: [],
      eventiGiornalieri: [], 
      checkinGiornalieri: [], // <-- RESTITUISCI ARRAY VUOTO IN CASO DI ERRORE
      documenti: [],
      lastUpdated: null,
    };
  }
};
