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
exports.syncDataTrigger = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
// Correggo l'importazione
const firestore_2 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const logger = __importStar(require("firebase-functions/logger"));
// Imposto la regione per tutte le funzioni in questo file
(0, v2_1.setGlobalOptions)({ region: "europe-west1" });
// Inizializza l'app Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const messaging = (0, messaging_1.getMessaging)();
// Modalità sicura DISATTIVATA DEFINITIVAMENTE
const SAFE_MODE = false;
// Funzione V3 (per tracciamento) che si attiva alla creazione di un documento in 'notificheRichieste'
exports.syncDataTrigger = (0, firestore_2.onDocumentCreated)("notificheRichieste/{docId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.log("Nessun dato associato all'evento, uscita.");
        return;
    }
    const docId = event.params.docId;
    const notificaData = snapshot.data();
    // Questo controllo è ora permanentemente disattivato
    if (SAFE_MODE) {
        logger.log(`[syncDataTrigger V3 - SAFE MODE] Triggered for doc: ${docId}. No action will be taken.`);
        return;
    }
    // NUOVO LOG DI VERSIONE
    logger.log(`[syncDataTrigger V3 - REGION europe-west1] Triggered for doc: ${docId}`);
    logger.log("[syncDataTrigger V3] Data:", notificaData);
    try {
        // 1. Invia la notifica FCM
        const message = {
            notification: {
                title: notificaData.title || "Nuova Notifica",
                body: notificaData.body || "Hai un nuovo messaggio",
            },
            topic: "all",
        };
        const fcmResponse = await messaging.send(message);
        logger.log("[syncDataTrigger V3] Notifica FCM inviata con successo:", fcmResponse);
        // 2. Prepara il documento per 'notificheInviate'
        const sentNotificaData = Object.assign(Object.assign({}, notificaData), { sentAt: firestore_1.Timestamp.now(), fcmMessageId: fcmResponse, status: "sent" });
        // 3. Salva nella collezione 'notificheInviate'
        await db.collection("notificheInviate").add(sentNotificaData);
        logger.log(`[syncDataTrigger V3] Documento ${docId} archiviato in notificheInviate.`);
        // 4. Elimina il documento originale da 'notificheRichieste'
        await db.collection("notificheRichieste").doc(docId).delete();
        logger.log(`[syncDataTrigger V3] Documento originale ${docId} eliminato da notificheRichieste.`);
    }
    catch (error) {
        logger.error(`[syncDataTrigger V3] Errore durante l'elaborazione del documento ${docId}:`, error);
    }
});
//# sourceMappingURL=index.js.map