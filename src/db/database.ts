
import Dexie, { Table } from 'dexie';
import { 
    Rapportino, 
    Anagrafica, 
    Categoria, 
    Cliente, 
    Ditta, 
    Luogo, 
    Nave, 
    TipoGiornata, 
    Veicolo, 
    Checkin, 
    Scadenza
} from '@/models/definitions';

export interface HourEntry {
  id?: number;
  tecnicoId: string;
  typeLabel: string;
  day: string; // YYYY-MM-DD
  hours: number;
}

export interface AppState {
    key: string; 
    value: any;
}

export interface SyncStatus {
    id: string;
    value: any;
}

export class RisoDexie extends Dexie {
    rapportini!: Table<Rapportino>;
    tecnici!: Table<Anagrafica>;
    clienti!: Table<Cliente>;
    ditte!: Table<Ditta>;
    luoghi!: Table<Luogo>;
    navi!: Table<Nave>;
    categorie!: Table<Categoria>;
    tipiGiornata!: Table<TipoGiornata>;
    veicoli!: Table<Veicolo>;
    checkins!: Table<Checkin>;
    documenti!: Table<Scadenza>;
    sync_status!: Table<SyncStatus>;
    // La tabella 'hours' non è più necessaria, la logica è stata spostata per leggere direttamente dai rapportini.
    // hours!: Table<HourEntry>; 
    app_state!: Table<AppState>;

    constructor() {
        super('RisoDexieV2'); // Manteniamo il nome V2 per la consistenza

        // VERSIONE 2: Aggiunge l'indice critico per le performance della pagina OreTecnici
        this.version(1).stores({
            rapportini: 'id, data, isDeleted, completed, tecnicoId, clienteId, naveId, *presenze',
            tecnici: 'id, nome, cognome',
            clienti: 'id, nome',
            ditte: 'id, nome',
            luoghi: 'id, nome',
            navi: 'id, nome, clienteId',
            categorie: 'id, nome',
            tipiGiornata: 'id, nome',
            veicoli: 'id, nome',
            checkins: 'id, data, tecnicoId',
            documenti: 'id, tipo, dataScadenza, ownerId',
            sync_status: 'id',
            app_state: '&key',
        });

        this.version(2).stores({
             // L'asterisco su 'presenze' crea un multi-entry index. Essenziale per la query.
            rapportini: 'id, data, isDeleted, completed, tecnicoId, clienteId, naveId, *presenze, [tecnicoId+data]'
        })

        // Inizializzazione di TUTTE le tabelle
        this.rapportini = this.table('rapportini');
        this.tecnici = this.table('tecnici');
        this.clienti = this.table('clienti');
        this.ditte = this.table('ditte');
        this.luoghi = this.table('luoghi');
        this.navi = this.table('navi');
        this.categorie = this.table('categorie');
        this.tipiGiornata = this.table('tipiGiornata');
        this.veicoli = this.table('veicoli');
        this.checkins = this.table('checkins');
        this.documenti = this.table('documenti');
        this.sync_status = this.table('sync_status');
        this.app_state = this.table('app_state');
    }
}

export const db = new RisoDexie();

if (typeof window !== 'undefined') {
  (window as any).db = db;
}
