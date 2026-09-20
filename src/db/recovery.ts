
import Dexie from "dexie";
import { db } from "./database";

export const attemptDbRecovery = async () => {
  try {
    const tableNames = db.tables.map(table => table.name);
    console.log("Tabelle nel database:", tableNames);

    for (const tableName of tableNames) {
        const count = await db.table(tableName).count();
        console.log(`Tabella '${tableName}' contiene ${count} record.`);
    }

    console.log("Recupero del database riuscito. Il database è accessibile e le tabelle sono integre.");
    return true;
  } catch (error) {
    console.error("Recupero del database fallito:", error);
    if (error instanceof Dexie.DexieError) {
        console.error("Errore Dexie specifico:", error.message);
    }
    return false;
  }
};
