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
exports.executeMigration = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Funzione onCall per migrare gli utenti da Firebase Authentication a Firestore.
 * Identifica gli utenti che non hanno un profilo nella collezione 'tecnici' e li crea.
 */
exports.executeMigration = (0, https_1.onCall)({ region: "europe-west1", cors: true }, async (request) => {
    logger.info("========================================");
    logger.info(">>> ESECUZIONE MIGRAZIONE UTENTI v2 <<<");
    logger.info("========================================");
    // 1. Controllo dei permessi di amministrazione
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La richiesta deve essere autenticata.");
    }
    if (request.auth.token.admin !== true) {
        logger.warn(`Tentativo di accesso non autorizzato da UID: ${request.auth.uid}`);
        throw new https_1.HttpsError("permission-denied", "Accesso negato. Solo gli amministratori possono eseguire la migrazione.");
    }
    logger.info(`Migrazione avviata dall'amministratore: ${request.auth.uid}`);
    const db = admin.firestore();
    const auth = admin.auth();
    let createdCount = 0;
    try {
        // 2. Ottenere tutti gli utenti da Firebase Authentication
        const listUsersResult = await auth.listUsers();
        const allAuthUsers = listUsersResult.users;
        logger.info(`Trovati ${allAuthUsers.length} utenti in Firebase Authentication.`);
        // 3. Ottenere tutti i tecnici da Firestore
        const tecniciSnapshot = await db.collection("tecnici").get();
        const firestoreTecniciIds = new Set(tecniciSnapshot.docs.map(doc => doc.id));
        logger.info(`Trovati ${firestoreTecniciIds.size} documenti nella collezione 'tecnici'.`);
        // 4. Identificare e creare i tecnici mancanti
        const batch = db.batch();
        for (const user of allAuthUsers) {
            if (!firestoreTecniciIds.has(user.uid)) {
                logger.info(`Trovato utente mancante in Firestore (UID: ${user.uid}, Email: ${user.email}). Creazione in corso...`);
                const docRef = db.collection("tecnici").doc(user.uid);
                // Estrai nome e cognome dall'email (o usa placeholder)
                const email = user.email || "";
                const nameParts = email.split('@')[0].split('.');
                const nome = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : "Utente";
                const cognome = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : "Migrato";
                batch.set(docRef, {
                    nome: nome,
                    cognome: cognome,
                    attivo: true, // Imposta l'utente come attivo di default
                    email: email,
                });
                createdCount++;
            }
        }
        // 5. Eseguire il batch di scrittura
        if (createdCount > 0) {
            await batch.commit();
            logger.info(`Batch commit completato. Creati ${createdCount} nuovi tecnici.`);
        }
        else {
            logger.info("Nessun tecnico mancante trovato. Il database è già sincronizzato.");
        }
        return {
            success: true,
            message: `Migrazione completata con successo. Creati ${createdCount} nuovi profili tecnico.`,
            createdCount: createdCount
        };
    }
    catch (error) {
        logger.error("Errore durante l'esecuzione della migrazione:", error);
        throw new https_1.HttpsError("internal", "Si è verificato un errore interno durante la migrazione. Controlla i log per i dettagli.");
    }
});
//# sourceMappingURL=migration.js.map