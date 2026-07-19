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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminaTecnico = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Funzione per eliminare un tecnico (utente Auth e/o documento Firestore).
 * Verifica che il chiamante sia un amministratore.
 * È progettata per essere resiliente e pulire i record "orfani" di Firestore.
 */
exports.eliminaTecnico = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Verifica dei permessi (CORRETTA)
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Questa funzione può essere chiamata solo da un amministratore.');
    }
    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'UID del tecnico non fornito.');
    }
    try {
        // 2. Tentativo di eliminazione dell'utente da Firebase Authentication.
        try {
            await admin.auth().deleteUser(uid);
            console.log(`Utente di autenticazione ${uid} eliminato con successo.`);
        }
        catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                console.log(`L'utente di autenticazione ${uid} non è stato trovato. Si procederà con la pulizia di Firestore.`);
            }
            else {
                console.error(`Errore durante l'eliminazione dell'utente di autenticazione ${uid}, ma si tenterà comunque di pulire Firestore. Errore:`, authError);
            }
        }
        // 3. Eliminazione del documento da Firestore.
        const tecnicoRef = admin.firestore().collection('tecnici').doc(uid);
        await tecnicoRef.delete();
        console.log(`Documento Firestore 'tecnici/${uid}' eliminato con successo.`);
        return { message: `Operazione di eliminazione per il tecnico ${uid} completata.` };
    }
    catch (error) {
        console.error(`Errore generale durante l'eliminazione del tecnico ${uid}:`, error);
        throw new functions.https.HttpsError('internal', `Si è verificato un errore imprevisto durante la pulizia del tecnico. Dettagli: ${error.message}`);
    }
});
//# sourceMappingURL=risorseUmane-eliminaTecnico.js.map