"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._doMigrationLogic = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
const db = (0, firestore_1.getFirestore)();
/**
 * Contiene la logica effettiva della migrazione.
 * Viene chiamata dalla funzione onCall v2 in index.ts.
 */
async function _doMigrationLogic() {
    firebase_functions_1.logger.info("Inizio migrazione rapportini senza cliente (v2).");
    try {
        const naviSnapshot = await db.collection("navi").get();
        const naviMap = new Map();
        naviSnapshot.forEach((doc) => naviMap.set(doc.id, doc.data()));
        firebase_functions_1.logger.info(`Trovate ${naviMap.size} navi.`);
        const clientiSnapshot = await db.collection("clienti").get();
        const clientiMap = new Map();
        clientiSnapshot.forEach((doc) => clientiMap.set(doc.id, doc.data()));
        firebase_functions_1.logger.info(`Trovati ${clientiMap.size} clienti.`);
        const rapportiniDaMigrareSnapshot = await db
            .collection("rapportini")
            .where("cliente", "==", null)
            .get();
        if (rapportiniDaMigrareSnapshot.empty) {
            const message = "Nessun rapportino da migrare trovato. La migrazione è già completata.";
            firebase_functions_1.logger.info(message);
            return { success: true, message, rapportiniAggiornati: 0 };
        }
        firebase_functions_1.logger.info(`Trovati ${rapportiniDaMigrareSnapshot.size} rapportini da migrare.`);
        const batch = db.batch();
        let contatoreAggiornati = 0;
        rapportiniDaMigrareSnapshot.forEach((doc) => {
            var _a;
            const rapportino = doc.data();
            const naveId = (_a = rapportino.sede) === null || _a === void 0 ? void 0 : _a.idNave;
            if (naveId) {
                const nave = naviMap.get(naveId);
                if (nave && nave.clienteId) {
                    const cliente = clientiMap.get(nave.clienteId);
                    if (cliente) {
                        const updateData = {
                            "cliente.idCliente": nave.clienteId,
                            "cliente.ragioneSocialeCliente": cliente.ragioneSociale,
                        };
                        batch.update(doc.ref, updateData);
                        contatoreAggiornati++;
                        firebase_functions_1.logger.info(`Rapportino ${doc.id} aggiornato con cliente ${cliente.ragioneSociale}`);
                    }
                    else {
                        firebase_functions_1.logger.warn(`Cliente non trovato per clienteId: ${nave.clienteId} (da nave ${naveId})`);
                    }
                }
                else {
                    firebase_functions_1.logger.warn(`Nave non trovata o senza clienteId per naveId: ${naveId}`);
                }
            }
            else {
                firebase_functions_1.logger.info(`Rapportino ${doc.id} non ha una nave associata, lo ignoro.`);
            }
        });
        await batch.commit();
        const message = `Migrazione completata con successo. ${contatoreAggiornati} rapportini sono stati aggiornati.`;
        firebase_functions_1.logger.info(message);
        return { success: true, message, rapportiniAggiornati: contatoreAggiornati };
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore durante la migrazione (v2):", error);
        // Rilancia l'errore per essere gestito dalla funzione onCall
        throw new Error(`Errore durante la migrazione: ${error}`);
    }
}
exports._doMigrationLogic = _doMigrationLogic;
//# sourceMappingURL=migration.js.map