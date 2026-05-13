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
exports.rapportiniTrigger = exports.fanOutNotifications = void 0;
// Importazioni unificate per lo stile V2
const admin = __importStar(require("firebase-admin"));
const messaging_1 = require("firebase-admin/messaging");
const firestore_1 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const logger = __importStar(require("firebase-functions/logger"));
// Inizializza l'app UNA SOLA VOLTA
admin.initializeApp();
const db = admin.firestore();
const messaging = (0, messaging_1.getMessaging)();
// Imposto la regione GLOBALE per tutte le funzioni v2
(0, v2_1.setGlobalOptions)({ region: "europe-west1" });
/**
 * ===================================================================
 *  FUNZIONE PER NOTIFICHE (V2)
 * ===================================================================
 */
exports.fanOutNotifications = (0, firestore_1.onDocumentCreated)("notificheRichieste/{docId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.log("[fanOutNotifications] Nessun dato associato all'evento.");
        return;
    }
    const docId = event.params.docId;
    const notificaData = snapshot.data();
    logger.log(`[fanOutNotifications] Triggered for doc: ${docId}`);
    try {
        const message = {
            notification: {
                title: notificaData.title || "Nuova Notifica",
                body: notificaData.body || "Hai un nuovo messaggio",
            },
            topic: "all",
        };
        const fcmResponse = await messaging.send(message);
        logger.log("[fanOutNotifications] Notifica FCM inviata:", fcmResponse);
        const sentNotificaData = Object.assign(Object.assign({}, notificaData), { sentAt: admin.firestore.Timestamp.now(), fcmMessageId: fcmResponse, status: "sent" });
        await db.collection("notificheInviate").add(sentNotificaData);
        logger.log(`[fanOutNotifications] Storico creato per doc: ${docId}`);
    }
    catch (error) {
        logger.error(`[fanOutNotifications] Errore per doc ${docId}:`, error);
    }
});
/**
 * ===================================================================
 *  FUNZIONE PER AGGREGAZIONE RAPPORTINI (Convertita a V2)
 * ===================================================================
 */
exports.rapportiniTrigger = (0, firestore_1.onDocumentWritten)("rapportini/{rapportinoId}", async (event) => {
    var _a, _b, _c;
    const change = event.data;
    if (!change) {
        logger.log("[rapportiniTrigger] Nessun dato di modifica trovato nell'evento.");
        return null;
    }
    const data = (_b = (_a = change.after) === null || _a === void 0 ? void 0 : _a.data()) !== null && _b !== void 0 ? _b : (_c = change.before) === null || _c === void 0 ? void 0 : _c.data();
    if (!data) {
        logger.log("[rapportiniTrigger] Nessun dato da processare.");
        return null;
    }
    const { tecnicoId } = data;
    if (!tecnicoId) {
        logger.error("[rapportiniTrigger] ID Tecnico mancante.");
        return null;
    }
    const timestamp = data.data || data.dataInizio;
    if (!timestamp || !timestamp.toDate) {
        logger.error("[rapportiniTrigger] Timestamp non valido.");
        return null;
    }
    const date = timestamp.toDate();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const monthKey = `${year}-${month}`;
    logger.log(`[rapportiniTrigger] Ricalcolo per tecnico ${tecnicoId} nel mese ${monthKey}.`);
    const riepilogoId = `${monthKey}_${tecnicoId}`;
    const riepilogoRef = db.collection("riepiloghiMensili").doc(riepilogoId);
    const startOfMonth = new Date(year, date.getMonth(), 1);
    const endOfMonth = new Date(year, date.getMonth() + 1, 0, 23, 59, 59);
    const rapportiniSnapshot = await db
        .collection("rapportini")
        .where("tecnicoId", "==", tecnicoId)
        .where("data", ">=", startOfMonth)
        .where("data", "<=", endOfMonth)
        .get();
    const aggregato = {
        oreLavorate: 0,
        giorniLavorati: 0,
        giorniFerie: 0,
        giorniMalattia: 0,
        giorniPermesso: 0,
    };
    rapportiniSnapshot.forEach((doc) => {
        var _a;
        const rapportino = doc.data();
        switch ((_a = rapportino.tipoGiornata) === null || _a === void 0 ? void 0 : _a.nome.toLowerCase()) {
            case "lavoro":
            case "lavoro straordinario":
                aggregato.oreLavorate += rapportino.oreLavoro || 0;
                aggregato.giorniLavorati += 1;
                break;
            case "ferie":
                aggregato.giorniFerie += 1;
                break;
            case "malattia":
                aggregato.giorniMalattia += 1;
                break;
            case "permesso":
                aggregato.giorniPermesso += 1;
                break;
            default:
                break;
        }
    });
    await riepilogoRef.set(Object.assign(Object.assign({ tecnicoId: tecnicoId, mese: monthKey }, aggregato), { lastUpdated: admin.firestore.FieldValue.serverTimestamp() }), { merge: false });
    logger.log(`[rapportiniTrigger] Riepilogo per ${tecnicoId} nel mese ${monthKey} aggiornato.`);
    return null;
});
//# sourceMappingURL=index.js.map