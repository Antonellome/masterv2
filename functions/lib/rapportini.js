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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const db = admin.firestore();
const REGION = 'us-central1';
// Funzione helper per l'autenticazione potenziata: restituisce l'intero token decodificato
const authenticate = async (req, res) => {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        firebase_functions_1.logger.error("Token non fornito o malformato.");
        res.status(401).json({ error: "Token non fornito." });
        return null;
    }
    const idToken = authorization.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore di verifica del token:", error);
        if (error.code === 'auth/id-token-expired') {
            res.status(401).json({ error: "Token scaduto." });
        }
        else {
            res.status(401).json({ error: "Token non valido." });
        }
        return null;
    }
};
// 1. CREAZIONE (Logica Corretta)
exports.createRapportino = (0, https_1.onRequest)({ cors: true, region: REGION }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const decodedToken = await authenticate(req, res);
    if (!decodedToken)
        return;
    const rapportinoData = req.body;
    if (!rapportinoData || !rapportinoData.tecnicoId) {
        res.status(400).json({ error: "Payload invalido, tecnicoId mancante." });
        return;
    }
    // REGOLA DI SICUREZZA: Permetti se l'utente è admin O se sta creando per se stesso.
    if (decodedToken.ruolo !== 'admin' && rapportinoData.tecnicoId !== decodedToken.uid) {
        res.status(403).json({ error: "Non autorizzato a creare rapportini per altri tecnici." });
        return;
    }
    try {
        const dataToSave = Object.assign(Object.assign({}, rapportinoData), { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: decodedToken.uid, updatedBy: decodedToken.uid });
        if (rapportinoData.data) {
            dataToSave.data = admin.firestore.Timestamp.fromDate(new Date(rapportinoData.data));
        }
        delete dataToSave.id;
        const newDocRef = await db.collection('rapportini').add(dataToSave);
        firebase_functions_1.logger.info(`Rapportino ${newDocRef.id} creato da UID ${decodedToken.uid}`);
        res.status(201).json({ id: newDocRef.id });
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore creazione rapportino:", error);
        res.status(500).json({ error: "Errore interno del server." });
    }
});
// 2. MODIFICA (Logica Corretta)
exports.updateRapportino = (0, https_1.onRequest)({ cors: true, region: REGION }, async (req, res) => {
    if (req.method !== 'PUT') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const decodedToken = await authenticate(req, res);
    if (!decodedToken)
        return;
    const _a = req.body, { id } = _a, dataFromClient = __rest(_a, ["id"]);
    if (!id) {
        res.status(400).json({ error: "ID del rapportino mancante." });
        return;
    }
    try {
        const docRef = db.collection('rapportini').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ error: "Rapportino non trovato." });
            return;
        }
        const existingData = doc.data();
        // REGOLA DI SICUREZZA (Corretta): Permetti se l'utente è admin O il tecnico principale.
        const isOwner = existingData.tecnicoId === decodedToken.uid;
        const isAdmin = decodedToken.ruolo === 'admin';
        if (!isOwner && !isAdmin) {
            res.status(403).json({ error: "Non autorizzato a modificare questo rapportino." });
            return;
        }
        const dataToUpdate = Object.assign(Object.assign(Object.assign({}, existingData), dataFromClient), { updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: decodedToken.uid });
        if (dataFromClient.data) {
            dataToUpdate.data = admin.firestore.Timestamp.fromDate(new Date(dataFromClient.data));
        }
        await docRef.update(dataToUpdate);
        firebase_functions_1.logger.info(`Rapportino ${id} aggiornato da UID ${decodedToken.uid} (Admin: ${isAdmin})`);
        res.status(200).json({ success: true, id: id });
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore aggiornamento rapportino ${id}:`, error);
        res.status(500).json({ error: "Errore interno del server." });
    }
});
// 3. CANCELLAZIONE (Logica Corretta)
exports.deleteRapportino = (0, https_1.onRequest)({ cors: true, region: REGION }, async (req, res) => {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const decodedToken = await authenticate(req, res);
    if (!decodedToken)
        return;
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ error: "ID del rapportino mancante." });
        return;
    }
    try {
        const docRef = db.collection('rapportini').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            res.status(404).json({ error: "Rapportino non trovato." });
            return;
        }
        // REGOLA DI SICUREZZA (Corretta): Permetti SOLO se l'utente è admin.
        const isAdmin = decodedToken.ruolo === 'admin';
        if (!isAdmin) {
            res.status(403).json({ error: "Non autorizzato a eliminare questo rapportino. L'operazione è consentita solo agli amministratori." });
            return;
        }
        await docRef.update({
            isDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: decodedToken.uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: decodedToken.uid,
        });
        firebase_functions_1.logger.info(`Rapportino ${id} eliminato (soft delete) da UID ${decodedToken.uid} (Admin: ${isAdmin})`);
        res.status(200).json({ success: true, id: id });
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore eliminazione rapportino ${id}:`, error);
        res.status(500).json({ error: "Errore interno del server." });
    }
});
//# sourceMappingURL=rapportini.js.map