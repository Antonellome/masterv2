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
exports.eliminaAnagrafica = exports.aggiornaAnagrafica = exports.creaAnagrafica = exports.syncAllAnagrafiche = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const db = admin.firestore();
const REGION = "europe-west1";
const COLLEZIONI_ANAGRAFICA = [
    "tecnici", "clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata"
];
const serializzaDocumento = (doc) => {
    const data = doc.data();
    if (!data)
        return { id: doc.id };
    const serializedData = { id: doc.id };
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            serializedData[key] = (value instanceof admin.firestore.Timestamp) ? value.toDate().toISOString() : value;
        }
    }
    return serializedData;
};
exports.syncAllAnagrafiche = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    }
    try {
        firebase_functions_1.logger.info(`Richiesta di sincronizzazione ANAGRAFICHE AGGREGATE per l'utente: ${request.auth.uid}`);
        // ** VALIDAZIONE E FORTIFICAZIONE (FASE T.3.B) **
        // Aggiungiamo .where("isDeleted", "!=", true) per garantire che solo i dati attivi
        // vengano sincronizzati con l'app offline, prevenendo dati obsoleti.
        const promises = COLLEZIONI_ANAGRAFICA.map(nomeCollezione => db.collection(nomeCollezione).where("isDeleted", "!=", true).get());
        const snapshots = await Promise.all(promises);
        const tutteLeAnagrafiche = {};
        snapshots.forEach((snapshot, index) => {
            const nomeCollezione = COLLEZIONI_ANAGRAFICA[index];
            tutteLeAnagrafiche[nomeCollezione] = snapshot.docs.map(serializzaDocumento);
        });
        firebase_functions_1.logger.info(`Sincronizzazione aggregata completata. Inviate ${COLLEZIONI_ANAGRAFICA.length} collezioni attive. Inclusi ${((_a = tutteLeAnagrafiche.tecnici) === null || _a === void 0 ? void 0 : _a.length) || 0} tecnici.`);
        return tutteLeAnagrafiche;
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore durante il recupero aggregato delle anagrafiche:", error);
        throw new https_1.HttpsError("internal", "Errore interno durante il recupero dei dati.");
    }
});
exports.creaAnagrafica = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    if (request.auth.token.role !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "Azione non autorizzata. Solo gli amministratori possono creare anagrafiche.");
    }
    const { nomeCollezione, dati } = request.data;
    if (!nomeCollezione || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione))
        throw new https_1.HttpsError("invalid-argument", "Nome collezione non valido o dati mancanti.");
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const docRef = await db.collection(nomeCollezione).add(Object.assign(Object.assign({}, dati), { createdAt: timestamp, updatedAt: timestamp, isDeleted: false }));
        firebase_functions_1.logger.info(`Admin ${request.auth.uid} ha creato un documento in ${nomeCollezione} con ID: ${docRef.id}`);
        return { status: "success", id: docRef.id };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante la creazione in ${nomeCollezione}:`, error);
        throw new https_1.HttpsError("internal", "Errore interno.");
    }
});
exports.aggiornaAnagrafica = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    if (request.auth.token.role !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "Azione non autorizzata. Solo gli amministratori possono aggiornare anagrafiche.");
    }
    const { nomeCollezione, docId, dati } = request.data;
    if (!nomeCollezione || !docId || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione))
        throw new https_1.HttpsError("invalid-argument", "Nome collezione, ID o dati non validi.");
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        await db.collection(nomeCollezione).doc(docId).update(Object.assign(Object.assign({}, dati), { updatedAt: timestamp }));
        firebase_functions_1.logger.info(`Admin ${request.auth.uid} ha aggiornato il documento ${docId} in ${nomeCollezione}`);
        return { status: "success" };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante l'aggiornamento di ${docId} in ${nomeCollezione}:`, error);
        throw new https_1.HttpsError("internal", "Errore interno.");
    }
});
exports.eliminaAnagrafica = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    if (request.auth.token.role !== 'admin')
        throw new https_1.HttpsError("permission-denied", "Azione non autorizzata. Solo gli admin possono eliminare.");
    const { nomeCollezione, docId } = request.data;
    if (!nomeCollezione || !docId || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione))
        throw new https_1.HttpsError("invalid-argument", "Nome collezione o ID non validi.");
    try {
        // MODIFICA: Da hard delete a soft delete per coerenza e sicurezza
        await db.collection(nomeCollezione).doc(docId).update({ isDeleted: true, deletedAt: admin.firestore.FieldValue.serverTimestamp() });
        firebase_functions_1.logger.info(`Admin ${request.auth.uid} ha eseguito un soft-delete del documento ${docId} da ${nomeCollezione}`);
        return { status: "success" };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore durante il soft-delete di ${docId} da ${nomeCollezione}:`, error);
        throw new https_1.HttpsError("internal", "Errore interno.");
    }
});
//# sourceMappingURL=anagrafiche.js.map