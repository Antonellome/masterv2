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
exports.deleteDocument = exports.updateDocument = exports.createDocument = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const REGION = "europe-west1";
// Funzione generica per creare un documento
exports.createDocument = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
    }
    if (request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Solo un amministratore può creare un documento.");
    }
    const { collection, docData } = request.data;
    if (!collection || !docData) {
        throw new https_1.HttpsError("invalid-argument", "Collezione e dati del documento sono obbligatori.");
    }
    try {
        const docRef = await admin.firestore().collection(collection).add(docData);
        firebase_functions_1.logger.info(`Admin ${request.auth.uid} ha creato un documento in ${collection} con ID: ${docRef.id}`);
        return { id: docRef.id };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore creazione documento in ${collection}:`, error);
        throw new https_1.HttpsError("internal", "Impossibile creare il documento.", error);
    }
});
// Funzione generica per aggiornare un documento
exports.updateDocument = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
    }
    if (request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Solo un amministratore può aggiornare un documento.");
    }
    const { collection, docId, docData } = request.data;
    if (!collection || !docId || !docData) {
        throw new https_1.HttpsError("invalid-argument", "Collezione, ID e dati del documento sono obbligatori.");
    }
    try {
        await admin.firestore().collection(collection).doc(docId).update(docData);
        firebase_functions_1.logger.info(`Admin ${request.auth.uid} ha aggiornato il documento ${docId} in ${collection}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore aggiornamento documento ${docId} in ${collection}:`, error);
        throw new https_1.HttpsError("internal", "Impossibile aggiornare il documento.", error);
    }
});
// Funzione generica per eliminare un documento
exports.deleteDocument = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
    }
    if (request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Solo un amministratore può eliminare un documento.");
    }
    const { collection, docId } = request.data;
    if (!collection || !docId) {
        throw new https_1.HttpsError("invalid-argument", "Collezione e ID del documento sono obbligatori.");
    }
    try {
        await admin.firestore().collection(collection).doc(docId).delete();
        firebase_functions_1.logger.info(`Admin ${request.auth.uid} ha eliminato il documento ${docId} in ${collection}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore eliminazione documento ${docId} in ${collection}:`, error);
        throw new https_1.HttpsError("internal", "Impossibile eliminare il documento.", error);
    }
});
//# sourceMappingURL=genericCrud.js.map