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
exports.migraStaffUnaTantum = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
/**
 * =====================================================================================
 * !! ATTENZIONE !! FUNZIONE DI MIGRAZIONE UNA TANTUM (USA E GETTA) !! ATTENZIONE !!
 * =====================================================================================
 *
 * OBIETTIVO: Leggere tutti gli utenti dalla vecchia collezione `utenti_master` e
 *            "marchiarli" nel sistema di Firebase Authentication con i Custom Claims corretti
 *            per la nuova architettura di sicurezza.
 *
 * CLAIMS IMPOSTATI:
 *  - `livello: 'staff'` : Identifica l'utente come personale amministrativo.
 *  - `admin: false`     : Imposta uno stato di partenza sicuro. I ruoli di admin verranno
 *                        poi assegnati manualmente tramite la nuova interfaccia.
 *
 * COME USARLA:
 * 1. Deployare questa funzione.
 * 2. Chiamarla UNA SOLA VOLTA (da un client autenticato come admin).
 * 3. Controllare i log per assicurarsi che la migrazione sia avvenuta con successo.
 * 4. Rimuovere (o disabilitare) la funzione dopo l'uso per evitare esecuzioni accidentali.
 */
exports.migraStaffUnaTantum = functions.region("europe-west1").https.onCall(async (data, context) => {
    var _a;
    // --- CONTROLLO AUTORIZZAZIONE ---
    if (!context.auth || context.auth.token.admin !== true) {
        logger.error(`Tentativo non autorizzato di eseguire la migrazione da UID: ${(_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid}`);
        throw new functions.https.HttpsError("permission-denied", "Solo un amministratore può eseguire la migrazione.");
    }
    logger.info("==========================================");
    logger.info("INIZIO MIGRAZIONE STAFF DA 'utenti_master'", { admin: context.auth.token.email });
    logger.info("==========================================");
    try {
        const utentiMasterSnapshot = await admin.firestore().collection('utenti_master').get();
        if (utentiMasterSnapshot.empty) {
            logger.warn("La collezione 'utenti_master' è vuota. Nessun utente da migrare.");
            return { status: "warning", message: "Nessun utente da migrare." };
        }
        const promises = [];
        let successCount = 0;
        let errorCount = 0;
        utentiMasterSnapshot.forEach(doc => {
            const uid = doc.id;
            const userData = doc.data();
            const email = userData.email || 'N/D';
            const promise = admin.auth().setCustomUserClaims(uid, {
                livello: 'staff', // Marchia come personale amministrativo
                admin: false // Stato di partenza sicuro
            }).then(() => {
                logger.info(`OK: Claim impostati per UID: ${uid} (Email: ${email})`);
                successCount++;
            }).catch(error => {
                logger.error(`FALLITO: Impossibile impostare i claim per UID: ${uid} (Email: ${email})`, error);
                errorCount++;
            });
            promises.push(promise);
        });
        await Promise.all(promises);
        logger.info("------------------------------------------");
        logger.info("MIGRAZIONE COMPLETATA");
        logger.info(`- Utenti processati con successo: ${successCount}`);
        logger.info(`- Utenti falliti: ${errorCount}`);
        logger.info("------------------------------------------");
        if (errorCount > 0) {
            return { status: "error", message: `Migrazione completata con ${errorCount} errori. Controllare i log.` };
        }
        return { status: "success", message: `Migrazione di ${successCount} utenti staff completata con successo.` };
    }
    catch (error) {
        logger.error("ERRORE CRITICO DURANTE LA MIGRAZIONE:", error);
        throw new functions.https.HttpsError("internal", `Errore catastrofico durante la migrazione: ${error.message}`);
    }
});
//# sourceMappingURL=migraStaffUnaTantum.js.map