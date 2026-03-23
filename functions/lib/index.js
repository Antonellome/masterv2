"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDataTrigger = exports.manageUsers = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
// Inizializza l'SDK di Firebase Admin una sola volta all'avvio.
admin.initializeApp();
// --- Funzione 1: L' "INTERFONO" (Gestione Utenti su Richiesta) ---
/**
 * Gestisce le operazioni sugli utenti richieste dall'app Master.
 * Richiede autenticazione come 'admin' per tutte le operazioni.
 * Agisce come dispatcher in base all'azione richiesta.
 */
exports.manageUsers = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    var _a, _b;
    // 1. CONTROLLO DI SICUREZZA FONDAMENTALE
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "Richiesta non autorizzata. Privilegi di Amministratore richiesti.");
    }
    const { action, payload } = request.data;
    const callingUid = request.auth.uid; // UID dell'admin che esegue l'operazione
    switch (action) {
        // AZIONE: Elencare tutti gli utenti
        case 'listAll':
            try {
                const userRecords = await admin.auth().listUsers(1000);
                const users = userRecords.users.map(user => {
                    var _a;
                    return ({
                        uid: user.uid,
                        email: user.email || 'N/A',
                        role: ((_a = user.customClaims) === null || _a === void 0 ? void 0 : _a.role) || 'Nessuno',
                        disabled: user.disabled,
                    });
                });
                return { users };
            }
            catch (error) {
                console.error("Errore nel recuperare la lista utenti:", error);
                throw new https_1.HttpsError("internal", "Impossibile recuperare la lista utenti.");
            }
        // AZIONE: Impostare un ruolo a un utente (Admin o Tecnico)
        case 'setRole':
            const { uid, newRole } = payload;
            if (!uid || !newRole) {
                throw new https_1.HttpsError("invalid-argument", "Payload non valido. 'uid' e 'newRole' sono obbligatori.");
            }
            // Un admin non può rimuovere il proprio ruolo per errore
            if (callingUid === uid && newRole !== 'admin') {
                throw new https_1.HttpsError("failed-precondition", "Un amministratore non può rimuovere il proprio ruolo.");
            }
            try {
                await admin.auth().setCustomUserClaims(uid, { role: newRole });
                return { message: `Ruolo per l'utente ${uid} aggiornato a ${newRole}.` };
            }
            catch (error) {
                console.error(`Errore nell'impostare il ruolo per ${uid}:`, error);
                throw new https_1.HttpsError("internal", "Errore durante l'aggiornamento del ruolo.");
            }
        // AZIONE: Creare un utente (per la pagina "Accesso App" dei tecnici)
        case 'createUser':
            const { email, password } = payload;
            if (!email || !password) {
                throw new https_1.HttpsError("invalid-argument", "Email e password sono obbligatori per creare un utente.");
            }
            try {
                const userRecord = await admin.auth().createUser({ email, password });
                // Opzionale: Imposta subito un ruolo se necessario, es. 'tecnico'
                // await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'tecnico' });
                return { uid: userRecord.uid, message: `Utente ${email} creato con successo.` };
            }
            catch (error) {
                console.error(`Errore nella creazione dell'utente ${email}:`, error);
                // Fornisce un messaggio d'errore più utile al frontend
                if (error.code === 'auth/email-already-exists') {
                    throw new https_1.HttpsError('already-exists', 'L\'indirizzo email è già in uso da un altro account.');
                }
                throw new https_1.HttpsError("internal", "Impossibile creare l'utente.");
            }
        default:
            throw new https_1.HttpsError("invalid-argument", `Azione '${action}' non riconosciuta.`);
    }
});
// --- Funzione 2: Il "CAMPANELLO" (Sincronizzazione Automatica) ---
/**
 * Si attiva quando il manifest di sincronizzazione viene aggiornato.
 * Invia una notifica push silenziosa ai dispositivi per avviare il sync.
 */
exports.syncDataTrigger = (0, firestore_1.onDocumentUpdated)({ document: "config/syncManifest", region: "europe-west1" }, async (event) => {
    var _a;
    console.log("Sync Manifest aggiornato. Trigger per la notifica PUSH attivato.");
    // Dati dopo la modifica
    const newData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    console.log("Nuovo stato del manifest:", newData);
    // TODO: Implementare la logica di invio notifica PUSH silenziosa (FCM)
    // 1. Recuperare i token FCM dei dispositivi da una collezione (es. 'deviceTokens').
    // 2. Costruire il messaggio di notifica (deve essere 'data-only' per essere silenzioso).
    // 3. Inviare il messaggio con admin.messaging().sendToDevice(...).
    console.log("LOGICA PUSH NON ANCORA IMPLEMENTATA.");
    return Promise.resolve();
});
//# sourceMappingURL=index.js.map