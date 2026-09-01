
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
    Checkin, // <-- Importo la definizione corretta
    Qualifica // Assicuriamoci che sia importato
} from '../models/definitions';

export interface SyncStatus {
    id: string;
    value: any;
}

// Definisco ed esporto il tipo per i nomi delle tabelle anagrafiche
export type AnagraficaTable = 
    | 'tecnici' 
    | 'navi' 
    | 'luoghi' 
    | 'clienti' 
    | 'categorie' 
    | 'ditte' 
    | 'tipiGiornata' 
    | 'veicoli'
    | 'cantieri'
    | 'qualifiche';

// Nomi delle tabelle allineati con Firestore
export class MySubClassedDexie extends Dexie {
  eventi_giornalieri!: Table<EventoGiornaliero>;
  checkin_giornalieri!: Table<Checkin>;
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
  qualifiche!: Table<Qualifica>; // Aggiungo la tabella qualifiche
  sync_status!: Table<SyncStatus>;
  rapportini!: Table<Rapportino>;
  documenti!: Table<Documento>;

  constructor() {
    super('gestionaleLavoro');

    this.version(10).stores({
        qualifiche: 'id, nome, isDirty'
    });

    this.version(9).stores({
        checkin_giornalieri: 'id, tecnicoId, timestampReale, tipo'
    });

    this.version(8).stores({
      eventi_giornalieri: 'id, tecnicoId, timestampReale, tipo',
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

    this.version(7).stores({}); // Pulisco le vecchie migrazioni non necessarie
  }
}

export const db = new MySubClassedDexie();

// ... (il resto del file rimane invariato)

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
        tipiGiornata,
        luoghi,
        navi,
        categorie,
        qualifiche,
        rapportini,
        eventiGiornalieri, 
        checkinGiornalieri,
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
          db.qualifiche.toArray(),
        ];
        const rapportiniPromise = db.rapportini.toArray();
        const eventiGiornalieriPromise = db.eventi_giornalieri.toArray();
        const checkinGiornalieriPromise = db.checkin_giornalieri.toArray();
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
        qualifiche
      };
      
      const lastUpdated = syncStatus?.value ? new Date(syncStatus.value) : null;
  
      return {
        anagrafiche,
        rapportini,
        eventiGiornalieri, 
        checkinGiornalieri,
        documenti,
        lastUpdated,
      };
    } catch (error) {
      console.error('[loadAllData] Errore critico durante il caricamento dei dati da IndexedDB:', error);
      return {
        anagrafiche: { tecnici: [], clienti: [], veicoli: [], cantieri: [], ditte: [], tipiGiornata: [], luoghi: [], navi: [], categorie: [], qualifiche: [] },
        rapportini: [],
        eventiGiornalieri: [], 
        checkinGiornalieri: [],
        documenti: [],
        lastUpdated: null,
      };
    }
  };
