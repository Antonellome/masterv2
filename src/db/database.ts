
import Dexie, { Table } from 'dexie';
import type { Nave, Cliente, Tecnico, Cantiere, Luogo, Rapportino, Presenza, TipoGiornata, User, Role, Permission, UserRole, RolePermission, Setting, Ditta, Categoria, Veicolo, Checkin, Documento, SyncStatus, AppState } from '@/models/definitions';

export class MySubClassedDexie extends Dexie {
  navi!: Table<Nave>;
  clienti!: Table<Cliente>;
  tecnici!: Table<Tecnico>;
  cantieri!: Table<Cantiere>;
  luoghi!: Table<Luogo>;
  rapportini!: Table<Rapportino>;
  presenze!: Table<Presenza>;
  tipiGiornata!: Table<TipoGiornata>;
  users!: Table<User>;
  roles!: Table<Role>;
  permissions!: Table<Permission>;
  userRoles!: Table<UserRole>;
  rolePermissions!: Table<RolePermission>;
  settings!: Table<Setting>;
  ditte!: Table<Ditta>;
  categorie!: Table<Categoria>;
  veicoli!: Table<Veicolo>;
  checkins!: Table<Checkin>;
  documenti!: Table<Documento>;
  sync_status!: Table<SyncStatus>;
  app_state!: Table<AppState>;

  constructor() {
    super('RisoMO');
    this.version(2).stores({
      navi: '++id, nome, clienteId',
      clienti: '++id, nome',
      tecnici: '++id, nome, cognome, attivo',
      cantieri: '++id, nome, clienteId',
      luoghi: '++id, nome',
      rapportini: '++id, tecnicoId, cantiereId, naveId, data, &uniqueId',
      tipiGiornata: '++id, nome',
      users: '++id, username, email, &uniqueId',
      roles: '++id, name, &uniqueId',
      permissions: '++id, name, &uniqueId',
      userRoles: '++id, userId, roleId, &uniqueId',
      rolePermissions: '++id, roleId, permissionId, &uniqueId',
      settings: '++id, key, value, &uniqueId',
      presenze: '++id, tecnicoId, data, tipo',
      ditte: '++id, nome',
      categorie: '++id, nome',
      veicoli: '++id, targa',
      checkins: '++id, tecnicoId, data, tipo',
      documenti: '++id, &uniqueId',
      sync_status: '++id',
      app_state: '++id'
    });
  }
}

export const db = new MySubClassedDexie();
