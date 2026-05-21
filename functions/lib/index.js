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
exports.sendNotification = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.sendNotification = (0, https_1.onCall)(async (request) => {
    // 1. Controllo di Autenticazione
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "L'utente deve essere autenticato per inviare notifiche.");
    }
    const { targetType, targetId, title, message } = request.data;
    // Validazione dell'input
    if (!targetType || !title || !message) {
        throw new https_1.HttpsError("invalid-argument", "L'input deve includere targetType, title, e message.");
    }
    let recipientUids = [];
    try {
        // 2. Recupera gli UID dei destinatari
        switch (targetType) {
            case "all":
                const allTecniciSnapshot = await db.collection("tecnici").get();
                recipientUids = allTecniciSnapshot.docs.map((doc) => doc.id);
                break;
            case "category":
                if (!targetId) {
                    throw new https_1.HttpsError("invalid-argument", "targetId è richiesto per targetType 'category'.");
                }
                const categoryTecniciSnapshot = await db
                    .collection("tecnici")
                    .where("category", "==", targetId)
                    .get();
                recipientUids = categoryTecniciSnapshot.docs.map((doc) => doc.id);
                break;
            case "user":
                if (!targetId) {
                    throw new https_1.HttpsError("invalid-argument", "targetId è richiesto per targetType 'user'.");
                }
                recipientUids.push(targetId);
                break;
            default:
                throw new https_1.HttpsError("invalid-argument", `targetType non valido. Usare 'all', 'category', o 'user'.`);
        }
        if (recipientUids.length === 0) {
            logger.warn("Nessun destinatario trovato per la notifica.", { data: request.data });
            return { success: false, message: "Nessun destinatario trovato." };
        }
        // 3. Crea i documenti di notifica con una Batch Write
        const batch = db.batch();
        const notificationsCollection = db.collection("notifications");
        recipientUids.forEach((uid) => {
            const newNotificationRef = notificationsCollection.doc();
            batch.set(newNotificationRef, {
                title,
                message,
                recipientId: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: "unread",
                readAt: null,
                readBy: null,
            });
        });
        await batch.commit();
        logger.info(`Notifiche create con successo per ${recipientUids.length} destinatari.`);
        return { success: true, message: `Notifiche inviate a ${recipientUids.length} destinatari.` };
    }
    catch (error) {
        logger.error("Errore durante l'invio delle notifiche:", error);
        throw new https_1.HttpsError("internal", "Si è verificato un errore interno durante la creazione delle notifiche.", error);
    }
});
//# sourceMappingURL=index.js.map