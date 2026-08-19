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
exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = exports.getAllRapportiniForSync = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const db = admin.firestore();
const REGION = "europe-west1";
// Funzione di utilità per convertire in modo sicuro qualsiasi valore in un oggetto Date o null.
// Gestisce Timestamp di Firestore, stringhe di data, e oggetti corrotti.
const toDateSafe = (timestamp) => {
    if (!timestamp)
        return null;
    if (timestamp && typeof timestamp.toDate === 'function') {
        // Formato Timestamp di Firestore standard
        return timestamp.toDate();
    }
    if (timestamp && typeof timestamp === 'object' && typeof timestamp._seconds === 'number') {
        // Formato oggetto comune quando i Timestamp vengono serializzati
        return new Date(timestamp._seconds * 1000);
    }
    // Prova a creare una data da una stringa o numero
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
        return d;
    }
    // Se tutto fallisce, logga l'anomalia e restituisci null
    firebase_functions_1.logger.warn("toDateSafe: Rilevato formato data non valido o corrotto.", { value: timestamp });
    return null;
};
exports.getAllRapportiniForSync = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    }
    try {
        const snapshot = await db.collection("rapportini").get();
        // 1. Mappa tutti i documenti includendo il loro ID.
        const allDocs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // 2. Filtra solo i documenti non marcati come eliminati.
        const activeDocs = allDocs.filter(doc => doc.isDeleted !== true);
        // ===========================================================================================
        //  ** LOGICA DI TRASFORMAZIONE CORRETTA **
        //  Non scartiamo più nessun documento. Usiamo `map` per trasformare ogni documento.
        //  Ogni campo data viene sanitizzato. Se un campo data è corrotto, diventa `null`,
        //  ma l'oggetto rapportino viene comunque incluso nel risultato.
        // ===========================================================================================
        const rapportiniProcessati = activeDocs.map(doc => {
            return Object.assign(Object.assign({}, doc), { dataInizio: toDateSafe(doc.dataInizio), createdAt: toDateSafe(doc.createdAt), dataFine: toDateSafe(doc.dataFine), updatedAt: toDateSafe(doc.updatedAt) });
        });
        // Questo log ora dovrebbe sempre riportare "Documenti scartati: 0".
        firebase_functions_1.logger.info(`Processo completato. Rapportini validi da inviare: ${rapportiniProcessati.length}. Documenti scartati: ${activeDocs.length - rapportiniProcessati.length}`);
        return { data: rapportiniProcessati };
    }
    catch (error) {
        firebase_functions_1.logger.error("ERRORE CRITICO in getAllRapportiniForSync:", error);
        throw new https_1.HttpsError("internal", "Errore interno durante il recupero dei dati.");
    }
});
// --- Funzioni CRUD mantenute per integrità ---
exports.createRapportino = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    const data = request.data;
    const dataWithTimestamps = Object.assign(Object.assign({}, data), { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: request.auth.uid, isDeleted: false });
    try {
        const docRef = await db.collection("rapportini").add(dataWithTimestamps);
        return { status: "success", id: docRef.id };
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore creazione rapportino:", error);
        throw new https_1.HttpsError("internal", "Errore interno.");
    }
});
exports.updateRapportino = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    const { id, data } = request.data;
    if (!id || !data)
        throw new https_1.HttpsError("invalid-argument", "ID o dati mancanti.");
    const dataWithTimestamp = Object.assign(Object.assign({}, data), { updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: request.auth.uid });
    try {
        await db.collection("rapportini").doc(id).update(dataWithTimestamp);
        return { status: "success" };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore aggiornamento ${id}:`, error);
        throw new https_1.HttpsError("internal", `Errore interno.`);
    }
});
exports.deleteRapportino = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Utente non autenticato.");
    const claims = request.auth.token;
    if (claims.role !== 'admin' && claims.role !== 'superadmin') {
        throw new https_1.HttpsError("permission-denied", "Solo gli amministratori possono eliminare.");
    }
    const { rapportinoId } = request.data;
    if (!rapportinoId)
        throw new https_1.HttpsError("invalid-argument", "ID rapportino non fornito.");
    try {
        await db.collection('rapportini').doc(rapportinoId).update({
            isDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: request.auth.uid
        });
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore soft-delete ${rapportinoId}:`, error);
        throw new https_1.HttpsError('internal', 'Errore interno durante l\'eliminazione.');
    }
});
//# sourceMappingURL=rapportini.js.map