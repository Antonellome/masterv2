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
exports.getAllRapportiniForSync = exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const db = admin.firestore();
const REGION = "us-central1";
// Funzione di utility per verificare i permessi
const verifyAuth = async (req, res) => {
    var _a;
    const idToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split('Bearer ')[1];
    if (!idToken) {
        res.status(401).json({ status: 'error', message: 'Token di autorizzazione mancante.' });
        return null;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore di autenticazione:`, error);
        res.status(401).json({ status: 'error', message: 'Token non valido o scaduto.' });
        return null;
    }
};
// ============================================================================
// FUNZIONE DI CREAZIONE - Logica di scrittura diretta e sicura con Timestamp
// ============================================================================
exports.createRapportino = (0, https_1.onRequest)({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const decodedToken = await verifyAuth(req, res);
    if (!decodedToken)
        return;
    const data = req.body.data || req.body;
    const dataWithTimestamps = Object.assign(Object.assign({}, data), { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: decodedToken.uid });
    try {
        const docRef = await db.collection('rapportini').add(dataWithTimestamps);
        firebase_functions_1.logger.info(`Rapportino creato con ID: ${docRef.id} da UID: ${decodedToken.uid}`);
        res.status(201).json({ status: 'success', id: docRef.id });
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore durante la creazione del rapportino:", error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante la creazione del rapportino.' });
    }
});
// ============================================================================
// FUNZIONE DI AGGIORNAMENTO - Logica di scrittura diretta e sicura con Timestamp
// ============================================================================
exports.updateRapportino = (0, https_1.onRequest)({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const decodedToken = await verifyAuth(req, res);
    if (!decodedToken)
        return;
    const { id, data } = req.body;
    if (!id || !data) {
        res.status(400).json({ status: 'error', message: 'ID o dati del rapportino mancanti.' });
        return;
    }
    const dataWithTimestamp = Object.assign(Object.assign({}, data), { updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: decodedToken.uid });
    try {
        const docRef = db.collection('rapportini').doc(id);
        await docRef.update(dataWithTimestamp);
        firebase_functions_1.logger.info(`Rapportino ${id} aggiornato con successo da UID: ${decodedToken.uid}`);
        res.status(200).json({ status: 'success' });
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante l'aggiornamento del rapportino ${id}:`, error);
        res.status(500).json({ status: 'error', message: `Errore interno durante l'aggiornamento del rapportino ${id}.` });
    }
});
// ============================================================================
// FUNZIONE DI CANCELLAZIONE - Verifiche di sicurezza migliorate
// ============================================================================
exports.deleteRapportino = (0, https_1.onRequest)({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const decodedToken = await verifyAuth(req, res);
    if (!decodedToken)
        return;
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ status: 'error', message: 'ID del rapportino mancante.' });
        return;
    }
    if (decodedToken.admin !== true) {
        firebase_functions_1.logger.warn(`Utente non autorizzato (UID: ${decodedToken.uid}) ha tentato di eliminare il rapportino ${id}.`);
        res.status(403).json({ status: 'error', message: "Azione non autorizzata. Solo gli amministratori possono eliminare." });
        return;
    }
    try {
        const docRef = db.collection('rapportini').doc(id);
        await docRef.delete();
        firebase_functions_1.logger.info(`Rapportino ${id} eliminato con successo dall'admin (UID: ${decodedToken.uid}).`);
        res.status(200).json({ status: 'success', message: `Rapportino ${id} eliminato.` });
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore CANCELLAZIONE rapportino ${id}:`, error);
        res.status(500).json({ status: 'error', message: 'Errore interno del server.' });
    }
});
// ===============================================================================
// FUNZIONE PER LA SINCRONIZZAZIONE - Restituisce tutti i rapportini per il client
// ===============================================================================
exports.getAllRapportiniForSync = (0, https_1.onRequest)({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') { // Le callable function sono sempre POST
        res.status(405).send('Method Not Allowed');
        return;
    }
    const decodedToken = await verifyAuth(req, res);
    if (!decodedToken)
        return; // Errore già gestito
    try {
        const snapshot = await db.collection('rapportini').get();
        const rapportini = snapshot.docs.map(doc => {
            var _a, _b;
            const data = doc.data();
            // Converti i timestamp di Firestore in un formato serializzabile (millisecondi)
            return Object.assign(Object.assign({}, data), { id: doc.id, data: data.data.toDate(), createdAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis(), updatedAt: (_b = data.updatedAt) === null || _b === void 0 ? void 0 : _b.toMillis() });
        });
        res.status(200).json({ data: rapportini });
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore durante il recupero dei rapportini per la sincronizzazione:", error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante il recupero dei dati.' });
    }
});
//# sourceMappingURL=rapportini.js.map