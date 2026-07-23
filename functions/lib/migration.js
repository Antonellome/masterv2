"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._doMigrationLogic = _doMigrationLogic;
const firestore_1 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
/**
 * Contiene la logica effettiva della migrazione.
 * Viene chiamata dalla funzione onCall v2 in index.ts.
 */
async function _doMigrationLogic() {
    var _a;
    // L'INIZIALIZZAZIONE DEL DB VIENE SPOSTATA QUI.
    // Questo evita qualsiasi problema di race condition durante l'avvio della funzione.
    const db = (0, firestore_1.getFirestore)();
    firebase_functions_1.logger.info("Inizio migrazione rapportini v3: Aggiunta log granulari.");
    try {
        firebase_functions_1.logger.info("Caricamento collezioni navi e clienti...");
        const naviSnapshot = await db.collection("navi").get();
        const naviMap = new Map();
        naviSnapshot.forEach((doc) => naviMap.set(doc.id, doc.data()));
        firebase_functions_1.logger.info(`Trovate ${naviMap.size} navi.`);
        const clientiSnapshot = await db.collection("clienti").get();
        const clientiMap = new Map();
        clientiSnapshot.forEach((doc) => clientiMap.set(doc.id, doc.data()));
        firebase_functions_1.logger.info(`Trovati ${clientiMap.size} clienti.`);
        firebase_functions_1.logger.info("Ricerca rapportini da migrare (cliente === null)...");
        const rapportiniDaMigrareSnapshot = await db
            .collection("rapportini")
            .where("cliente", "==", null)
            .get();
        if (rapportiniDaMigrareSnapshot.empty) {
            const message = "Nessun rapportino da migrare trovato. Database già aggiornato.";
            firebase_functions_1.logger.info(message);
            return { success: true, message, rapportiniAggiornati: 0 };
        }
        firebase_functions_1.logger.info(`Trovati ${rapportiniDaMigrareSnapshot.size} rapportini da elaborare.`);
        const batch = db.batch();
        let contatoreAggiornati = 0;
        for (const doc of rapportiniDaMigrareSnapshot.docs) {
            firebase_functions_1.logger.info(`--- Inizio elaborazione rapportino ID: ${doc.id} ---`);
            try {
                const rapportino = doc.data();
                // Log della struttura del singolo rapportino per debug
                firebase_functions_1.logger.debug(`Dati rapportino ${doc.id}:`, { data: rapportino });
                const naveId = (_a = rapportino.sede) === null || _a === void 0 ? void 0 : _a.idNave;
                if (naveId) {
                    firebase_functions_1.logger.info(`Rapportino ${doc.id} ha naveId: ${naveId}. Cerco la nave...`);
                    const nave = naviMap.get(naveId);
                    if (nave && nave.clienteId) {
                        firebase_functions_1.logger.info(`Trovata nave ${naveId} con clienteId: ${nave.clienteId}. Cerco il cliente...`);
                        const cliente = clientiMap.get(nave.clienteId);
                        if (cliente) {
                            firebase_functions_1.logger.info(`Trovato cliente ${cliente.ragioneSociale} (${nave.clienteId}). Aggiungo al batch.`);
                            const updateData = {
                                "cliente.idCliente": nave.clienteId,
                                "cliente.ragioneSocialeCliente": cliente.ragioneSociale,
                            };
                            batch.update(doc.ref, updateData);
                            contatoreAggiornati++;
                        }
                        else {
                            firebase_functions_1.logger.warn(`Cliente non trovato per clienteId: ${nave.clienteId} (da nave ${naveId}) - Rapportino ${doc.id}`);
                        }
                    }
                    else {
                        firebase_functions_1.logger.warn(`Nave non trovata o senza clienteId per naveId: ${naveId} - Rapportino ${doc.id}`);
                    }
                }
                else {
                    firebase_functions_1.logger.warn(`Rapportino ${doc.id} non ha un idNave in sede, lo ignoro.`);
                }
            }
            catch (innerError) {
                firebase_functions_1.logger.error(`!!! Errore CRITICO durante l'elaborazione del singolo rapportino ID: ${doc.id}. Questo rapportino verrà saltato.`, innerError);
            }
            firebase_functions_1.logger.info(`--- Fine elaborazione rapportino ID: ${doc.id} ---\n`);
        }
        if (contatoreAggiornati > 0) {
            firebase_functions_1.logger.info(`Esecuzione del batch commit per ${contatoreAggiornati} aggiornamenti...`);
            await batch.commit();
            firebase_functions_1.logger.info("Batch commit completato con successo.");
        }
        else {
            firebase_functions_1.logger.info("Nessun rapportino è stato modificato, non eseguo il batch commit.");
        }
        const message = `Migrazione completata. ${contatoreAggiornati} rapportini sono stati aggiornati. Controllare i log per eventuali avvisi o errori su singoli documenti.`;
        firebase_functions_1.logger.info(message);
        return { success: true, message, rapportiniAggiornati: contatoreAggiornati };
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore CATASTROFICO durante la migrazione (v3):", error);
        throw new Error(`Errore durante la migrazione: ${error}`);
    }
}
//# sourceMappingURL=migration.js.map