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
exports.createTecnico = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
// L'SDK di Admin è già inizializzato nel file index.ts principale
exports.createTecnico = (0, https_1.onCall)({ region: "europe-west1", cors: true }, async (request) => {
    var _a, _b, _c;
    // 1. CONTROLLO AUTENTICAZIONE E PERMESSI DA AMMINISTRATORE
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== "admin") {
        logger.error(`Tentativo di accesso non autorizzato a createTecnico. UID: ${((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'Nessuno'}`);
        throw new https_1.HttpsError("permission-denied", "Solo un amministratore può creare nuovi tecnici.");
    }
    // 2. ESTRAZIONE E VALIDAZIONE DEI DATI DI INPUT
    const _d = request.data, { nome, cognome, email, password, appAccess } = _d, rest = __rest(_d, ["nome", "cognome", "email", "password", "appAccess"]);
    if (!nome || !cognome || !email) {
        throw new https_1.HttpsError("invalid-argument", "Dati incompleti. Nome, cognome ed email sono obbligatori.");
    }
    logger.info(`Inizio creazione tecnico per ${email}. Richiesta da admin: ${request.auth.token.email}. Accesso App richiesto: ${appAccess}`);
    let userRecord;
    try {
        // 3. LOGICA DI CREAZIONE UTENTE IN BASE AD APPACCESS
        if (appAccess === true) {
            // CASO 1: L'utente deve avere accesso all'app
            if (!password || password.length < 6) {
                throw new https_1.HttpsError("invalid-argument", "Per abilitare l'accesso è richiesta una password di almeno 6 caratteri.");
            }
            logger.info(`Creazione utente ABILITATO per ${email}`);
            userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: `${nome} ${cognome}`,
                disabled: false, // L'utente è attivo
            });
        }
        else {
            // CASO 2: L'utente NON deve avere accesso all'app
            // Creo comunque l'utente per avere un UID, ma lo lascio disabilitato.
            // La password è casuale e irrilevante.
            logger.info(`Creazione utente DISABILITATO per ${email}`);
            userRecord = await admin.auth().createUser({
                email: email,
                password: `disabled_${Date.now()}_${Math.random().toString(36).slice(-8)}`,
                displayName: `${nome} ${cognome}`,
                disabled: true, // L'utente NON può accedere
            });
        }
        logger.info(`Utente di autenticazione creato con UID: ${userRecord.uid}. Stato: ${appAccess ? "Abilitato" : "Disabilitato"}`);
    }
    catch (error) {
        logger.error("ERRORE Critico durante la creazione dell'utente in Firebase Authentication:", error);
        if (error.code === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "Questo indirizzo email è già in uso da un altro utente.");
        }
        throw new https_1.HttpsError("internal", "Errore imprevisto durante la creazione dell'utente di autenticazione.");
    }
    const uid = userRecord.uid;
    // 4. PREPARAZIONE E SCRITTURA DEI DATI IN FIRESTORE
    const tecnicoData = Object.assign(Object.assign({}, rest), { uid: uid, email: email, nome: nome, cognome: cognome, nomeCompleto: `${nome} ${cognome}`, attivo: (_c = rest.attivo) !== null && _c !== void 0 ? _c : true, appAccess: appAccess !== null && appAccess !== void 0 ? appAccess : false, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    try {
        await admin.firestore().collection("tecnici").doc(uid).set(tecnicoData);
        logger.info(`Documento tecnico salvato con successo in Firestore con ID: ${uid}`);
    }
    catch (error) {
        logger.error(`ERRORE GRAVE durante la scrittura su Firestore per UID: ${uid}`, error);
        // Se la scrittura su Firestore fallisce, elimino l'utente appena creato
        // per evitare di lasciare un utente di autenticazione "orfano".
        await admin.auth().deleteUser(uid);
        logger.warn(`ROLLBACK ESEGUITO: L'utente di autenticazione ${uid} è stato eliminato.`);
        throw new https_1.HttpsError("internal", "Non è stato possibile salvare i dati del tecnico nel database. L'utente creato è stato rimosso.");
    }
    // 5. OPERAZIONE COMPLETATA CON SUCCESSO
    return {
        status: "success",
        message: `Tecnico ${nome} ${cognome} creato con successo con UID: ${uid}.`,
        uid: uid,
    };
});
//# sourceMappingURL=createTecnico.js.map