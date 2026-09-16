
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
    Qualifica, 
    Checkin, // Importo il tipo Checkin
    Scadenza   // Importo il tipo Scadenza
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
    checkins!: Table<Checkin>;     // <-- AGGIUNTA TABELLA CHECKINS
    documenti!: Table<Scadenza>; // <-- AGGIUNTA TABELLA DOCUMENTI/SCADENZE
    sync_status!: Table<SyncStatus>;

    constructor() {
        super('RisoDexie');
        // Incremento la versione per permettere l'aggiornamento dello schema
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
            qualifiche: 'id, nome',
            checkins: 'id, data, tecnicoId', // <-- DEFINIZIONE SCHEMA
            documenti: 'id, tipo, dataScadenza, tecnicoId', // <-- DEFINIZIONE SCHEMA
            sync_status: 'id'
        });

        // Gestisco l'upgrade dalla versione 1 alla 2
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
            sync_status: 'id'
        }).upgrade(tx => {
            // La migrazione è vuota perché Dexie gestisce l'aggiunta
            // di nuove tabelle automaticamente. Questo blocco serve
            // per registrare correttamente la transizione di versione.
            console.log("Upgrade da v1 a v2: aggiunta tabelle checkins e documenti.");
        });
    }
}

export const db = new RisoDexie();

// Mantiene l'accesso globale per il debug durante lo sviluppo
if (typeof window !== 'undefined') {
  (window as any).db = db;
}
