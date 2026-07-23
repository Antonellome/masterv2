"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Script di migrazione definitivo, basato sull'analisi dei dati reali.
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
async function runDefinitiveMigration() {
    var _a;
    const db = (0, firestore_1.getFirestore)();
    console.log("INIZIO MIGRAZIONE DEFINITIVA: Campo `dettaglioOreTecnici` e ricalcolo `oreLavoro`.");
    const rapportiniRef = db.collection('rapportini');
    const batch = db.batch();
    let updatedCount = 0;
    let totalDocs = 0;
    const snapshot = await rapportiniRef.get();
    totalDocs = snapshot.docs.length;
    console.log(`Trovati ${totalDocs} rapportini in totale. Inizio analisi...`);
    for (const doc of snapshot.docs) {
        const data = doc.data();
        // La condizione di migrazione: `dettaglioOreTecnici` non esiste o e' un array vuoto.
        const needsMigration = !data.dettaglioOreTecnici || data.dettaglioOreTecnici.length === 0;
        if (needsMigration) {
            const oldOreLavoro = (_a = data.oreLavoro) !== null && _a !== void 0 ? _a : 0;
            const tecnicoPrincipale = data.tecnicoId;
            if (tecnicoPrincipale && oldOreLavoro > 0) {
                console.log(` -> Migrazione necessaria per il rapportino ID: ${doc.id}`);
                updatedCount++;
                const allTecniciIds = new Set();
                allTecniciIds.add(tecnicoPrincipale);
                const presenze = data.presenze || data.altriTecniciIds || [];
                presenze.forEach((id) => id && allTecniciIds.add(id));
                const newDettaglio = [];
                allTecniciIds.forEach(id => {
                    newDettaglio.push({ tecnicoId: id, ore: oldOreLavoro });
                });
                // Ricalcola il totale oreLavoro come somma
                const newOreLavoro = newDettaglio.reduce((sum, item) => sum + item.ore, 0);
                const updates = {
                    dettaglioOreTecnici: newDettaglio,
                    oreLavoro: newOreLavoro
                };
                batch.update(doc.ref, updates);
            }
        }
    }
    if (updatedCount > 0) {
        await batch.commit();
        console.log(`\n--- MIGRAZIONE DEFINITIVA COMPLETATA ---`);
        console.log(`${updatedCount} su ${totalDocs} rapportini sono stati migrati.`);
    }
    else {
        console.log("\n--- NESSUNA MIGRAZIONE NECESSARIA ---");
        console.log(`Tutti i ${totalDocs} rapportini analizzati risultano già conformi.`);
    }
}
// --- ESECUZIONE ---
async function main() {
    try {
        admin.initializeApp();
        await runDefinitiveMigration();
        process.exit(0);
    }
    catch (error) {
        console.error("\n!!! ESECUZIONE MIGRAZIONE FALLITA !!!", error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=_runner_definitivo.js.map