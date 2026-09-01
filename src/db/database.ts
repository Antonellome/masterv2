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
    Qualifica 
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
    qualifiche!: Table<Qualifica>;
    sync_status!: Table<SyncStatus>; // <-- TABELLA AGGIUNTA

    constructor() {
        super('RisoDexie');
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
            qualifiche: 'id, nome',
            sync_status: 'id' // <-- DEFINIZIONE TABELLA
        });
    }
}

export const db = new RisoDexie();

// MODIFICA TEMPORANEA PER DEBUG
if (typeof window !== 'undefined') {
  (window as any).db = db;
}