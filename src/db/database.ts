
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

    constructor() {
        super('RisoDexie');
        // VERSIONE 4: Rimozione tabella qualifiche
        this.version(4).stores({
            rapportini: 'id, data, isDeleted, completed, tecnicoId, clienteId, naveId',
            tecnici: 'id, nome',
            clienti: 'id, nome',
            ditte: 'id, nome',
            luoghi: 'id, nome',
            navi: 'id, nome, clienteId',
            categorie: 'id, nome',
            tipiGiornata: 'id, nome',
            veicoli: 'id, nome',
            checkins: 'id, data, tecnicoId',
            documenti: 'id, tipo, dataScadenza, ownerId',
            sync_status: 'id'
        }).upgrade(tx => {
            return tx.table('qualifiche').clear();
        });

        this.version(3).stores({
            rapportini: 'id, data, isDeleted, completed, tecnicoId, clienteId, naveId',
            tecnici: 'id, nome',
            clienti: 'id, nome',
            ditte: 'id, nome',
            luoghi: 'id, nome',
            navi: 'id, nome, clienteId',
            categorie: 'id, nome',
            tipiGiornata: 'id, nome',
            veicoli: 'id, nome',
            checkins: 'id, data, tecnicoId',
            documenti: 'id, tipo, dataScadenza, tecnicoId',
            sync_status: 'id'
        });

        this.version(2).stores({
            rapportini: 'id, data, tecnicoId, naveId, clienteId',
            tecnici: 'id, nome',
            clienti: 'id, nome',
            ditte: 'id, nome',
            luoghi: 'id, nome',
            navi: 'id, nome, clienteId',
            categorie: 'id, nome',
            tipiGiornata: 'id, nome',
            veicoli: 'id, nome',
            checkins: 'id, data, tecnicoId',
            documenti: 'id, tipo, dataScadenza, tecnicoId',
            sync_status: 'id'
        });

        this.version(1).stores({
            rapportini: 'id, data, tecnicoId, naveId, clienteId',
            tecnici: 'id, nome',
            clienti: 'id, nome',
            ditte: 'id, nome',
            luoghi: 'id, nome',
            navi: 'id, nome, clienteId',
            categorie: 'id, nome',
            tipiGiornata: 'id, nome',
            veicoli: 'id, nome',
            sync_status: 'id'
        });
    }
}

export const db = new RisoDexie();

if (typeof window !== 'undefined') {
  (window as any).db = db;
}
