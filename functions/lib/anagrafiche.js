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
exports.eliminaAnagrafica = exports.aggiornaAnagrafica = exports.syncAllAnagrafiche = exports.creaAnagrafica = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
// Inizializzazione di Firestore
const db = admin.firestore();
const REGION = "us-central1";
// --- FUNZIONI DI UTILITA' E SICUREZZA ---
/**
 * Verifica il token di autorizzazione Firebase nell'header della richiesta.
 * @param req La richiesta in ingresso.
 * @param res La risposta da inviare in caso di errore.
 * @returns Il token decodificato se valido, altrimenti null.
 */
const verificaAutenticazione = async (req, res) => {
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
// Lista bianca delle collezioni di anagrafica consentite per le operazioni CRUD.
const COLLEZIONI_ANAGRAFICA = [
    'clienti',
    'navi',
    'luoghi',
    'ditte',
    'categorie',
    'veicoli',
    'tipiGiornata'
];
/**
 * Serializza un documento Firestore, convertendo i Timestamp in millisecondi.
 * @param doc Il documento snapshot di Firestore.
 * @returns Un oggetto serializzato o null.
 */
const serializzaDocumento = (doc) => {
    const data = doc.data();
    if (!data)
        return null;
    const serializedData = { id: doc.id };
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            serializedData[key] = (value instanceof admin.firestore.Timestamp) ? value.toMillis() : value;
        }
    }
    return serializedData;
};
// --- API CLOUD FUNCTIONS PER LE ANAGRAFICHE ---
// 1. CREAZIONE (CREATE)
exports.creaAnagrafica = (0, https_1.onRequest)({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Metodo non consentito');
        return;
    }
    const decodedToken = await verificaAutenticazione(req, res);
    if (!decodedToken)
        return;
    const { nomeCollezione, dati } = req.body;
    if (!nomeCollezione || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) {
        res.status(400).json({ status: 'error', message: 'Nome collezione non valido o dati mancanti.' });
        return;
    }
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const docRef = await db.collection(nomeCollezione).add(Object.assign(Object.assign({}, dati), { createdAt: timestamp, updatedAt: timestamp }));
        firebase_functions_1.logger.info(`Utente ${decodedToken.uid} ha creato un documento in ${nomeCollezione} con ID: ${docRef.id}`);
        res.status(201).json({ data: { id: docRef.id } });
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante la creazione in ${nomeCollezione}:`, error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante la creazione del documento.' });
    }
});
// 2. LETTURA (READ - per la sincronizzazione iniziale)
exports.syncAllAnagrafiche = (0, https_1.onRequest)({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Metodo non consentito');
        return;
    }
    const decodedToken = await verificaAutenticazione(req, res);
    if (!decodedToken)
        return;
    try {
        firebase_functions_1.logger.info(`Richiesta di sincronizzazione ANAGRAFICHE AGGREGATE per l'utente: ${decodedToken.uid}`);
        const promises = COLLEZIONI_ANAGRAFICA.map(nomeCollezione => db.collection(nomeCollezione).get());
        const snapshots = await Promise.all(promises);
        const tutteLeAnagrafiche = {};
        snapshots.forEach((snapshot, index) => {
            const nomeCollezione = COLLEZIONI_ANAGRAFICA[index];
            tutteLeAnagrafiche[nomeCollezione] = snapshot.docs.map(serializzaDocumento).filter(doc => doc !== null);
        });
        firebase_functions_1.logger.info(`Sincronizzazione aggregata completata. Inviate ${COLLEZIONI_ANAGRAFICA.length} collezioni.`);
        res.status(200).json({ data: tutteLeAnagrafiche });
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore durante il recupero aggregato delle anagrafiche:", error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante il recupero dei dati.' });
    }
});
// 3. AGGIORNAMENTO (UPDATE)
exports.aggiornaAnagrafica = (0, https_1.onRequest)({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Metodo non consentito');
        return;
    }
    const decodedToken = await verificaAutenticazione(req, res);
    if (!decodedToken)
        return;
    const { nomeCollezione, docId, dati } = req.body;
    if (!nomeCollezione || !docId || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) {
        res.status(400).json({ status: 'error', message: 'Nome collezione, ID documento o dati non validi.' });
        return;
    }
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        await db.collection(nomeCollezione).doc(docId).update(Object.assign(Object.assign({}, dati), { updatedAt: timestamp }));
        firebase_functions_1.logger.info(`Utente ${decodedToken.uid} ha aggiornato il documento ${docId} in ${nomeCollezione}`);
        res.status(200).json({ status: 'success' });
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante l'aggiornamento di ${docId} in ${nomeCollezione}:`, error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante l\'aggiornamento del documento.' });
    }
});
// 4. CANCELLAZIONE (DELETE)
exports.eliminaAnagrafica = (0, https_1.onRequest)({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Metodo non consentito');
        return;
    }
    const decodedToken = await verificaAutenticazione(req, res);
    if (!decodedToken)
        return;
    const { nomeCollezione, docId } = req.body;
    if (!nomeCollezione || !docId || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) {
        res.status(400).json({ status: 'error', message: 'Nome collezione o ID documento non validi.' });
        return;
    }
    try {
        await db.collection(nomeCollezione).doc(docId).delete();
        firebase_functions_1.logger.info(`Utente ${decodedToken.uid} ha eliminato il documento ${docId} da ${nomeCollezione}`);
        res.status(200).json({ status: 'success' });
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante l'eliminazione di ${docId} da ${nomeCollezione}:`, error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante l\'eliminazione del documento.' });
    }
});
//# sourceMappingURL=anagrafiche.js.map