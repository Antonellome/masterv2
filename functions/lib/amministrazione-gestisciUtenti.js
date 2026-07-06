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
exports.amministrazione_gestisciUtenti = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const auth = admin.auth();
exports.amministrazione_gestisciUtenti = functions.region("europe-west1").https.onCall(async (data, context) => {
    // 1. Validazione dell'autenticazione e dei permessi
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "La richiesta richiede autenticazione.");
    }
    const adminUser = await auth.getUser(context.auth.uid);
    const customClaims = adminUser.customClaims || {};
    if (customClaims.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Autorizzazione negata. Solo gli amministratori possono gestire gli utenti.");
    }
    // 2. Validazione dei dati in ingresso
    const { uid, action, role } = data;
    if (!uid || !action || (action === 'setRole' && !role)) {
        throw new functions.https.HttpsError("invalid-argument", "Argomenti non validi. Fornire 'uid', 'action', e 'role'.");
    }
    try {
        // 3. Logica Principale CORRETTA
        const targetUser = await auth.getUser(uid);
        let newClaims = {}; // <<<< LA CORREZIONE È QUI. CREA UN OGGETTO VUOTO.
        if (action === 'setRole') {
            if (role === 'admin' || role === 'user') {
                // Assegna solo il ruolo richiesto, eliminando ogni altro permesso vecchio.
                newClaims = { role: role };
            }
            else {
                throw new functions.https.HttpsError("invalid-argument", `Ruolo non valido: ${role}. Usare 'admin' o 'user'.`);
            }
        }
        else {
            throw new functions.https.HttpsError("invalid-argument", `Azione non valida: ${action}. Usare 'setRole'.`);
        }
        // Imposta i nuovi custom claims, sovrascrivendo completamente i vecchi.
        await auth.setCustomUserClaims(uid, newClaims);
        console.log(`Ruolo di ${targetUser.email} (UID: ${uid}) aggiornato a '${role}' da ${adminUser.email}`);
        return { success: true, message: `Ruolo di ${targetUser.displayName || uid} aggiornato a ${role}.` };
    }
    catch (error) {
        console.error(`Errore durante la gestione dell'utente ${uid}:`, error);
        throw new functions.https.HttpsError("internal", `Si è verificato un errore interno: ${error.message}`);
    }
});
//# sourceMappingURL=amministrazione-gestisciUtenti.js.map