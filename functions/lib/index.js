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
exports.riparaScuderi = exports.admin_getAllUsers = exports.forceAdmin = exports.risorseUmane_gestisciAccessoTecnico = exports.amministrazione_gestisciUtenti = exports.createTecnico = exports.createCheckin = exports.eliminaAnagrafica = exports.aggiornaAnagrafica = exports.syncAllAnagrafiche = exports.creaAnagrafica = exports.getAllRapportiniForSync = exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = exports.deleteDocument = exports.updateDocument = exports.createDocument = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// --- Funzioni CRUD Generiche (NUOVA ARCHITETTURA) ---
var genericCrud_1 = require("./genericCrud");
Object.defineProperty(exports, "createDocument", { enumerable: true, get: function () { return genericCrud_1.createDocument; } });
Object.defineProperty(exports, "updateDocument", { enumerable: true, get: function () { return genericCrud_1.updateDocument; } });
Object.defineProperty(exports, "deleteDocument", { enumerable: true, get: function () { return genericCrud_1.deleteDocument; } });
// --- FUNZIONI DI BUSINESS SPECIFICHE ---
// Rapportini - API HTTP Completa
var rapportini_1 = require("./rapportini");
Object.defineProperty(exports, "createRapportino", { enumerable: true, get: function () { return rapportini_1.createRapportino; } });
Object.defineProperty(exports, "updateRapportino", { enumerable: true, get: function () { return rapportini_1.updateRapportino; } });
Object.defineProperty(exports, "deleteRapportino", { enumerable: true, get: function () { return rapportini_1.deleteRapportino; } });
Object.defineProperty(exports, "getAllRapportiniForSync", { enumerable: true, get: function () { return rapportini_1.getAllRapportiniForSync; } });
// Anagrafiche - API HTTP Completa (NUOVA AGGIUNTA FASE D)
var anagrafiche_1 = require("./anagrafiche");
Object.defineProperty(exports, "creaAnagrafica", { enumerable: true, get: function () { return anagrafiche_1.creaAnagrafica; } });
Object.defineProperty(exports, "syncAllAnagrafiche", { enumerable: true, get: function () { return anagrafiche_1.syncAllAnagrafiche; } });
Object.defineProperty(exports, "aggiornaAnagrafica", { enumerable: true, get: function () { return anagrafiche_1.aggiornaAnagrafica; } });
Object.defineProperty(exports, "eliminaAnagrafica", { enumerable: true, get: function () { return anagrafiche_1.eliminaAnagrafica; } });
// Check-in - API Sicura per le Presenze (NUOVA AGGIUNTA FASE F2)
var checkin_1 = require("./checkin");
Object.defineProperty(exports, "createCheckin", { enumerable: true, get: function () { return checkin_1.createCheckin; } });
// Gestione Tecnici e Utenti
var createTecnico_1 = require("./createTecnico");
Object.defineProperty(exports, "createTecnico", { enumerable: true, get: function () { return createTecnico_1.createTecnico; } });
var amministrazioneGestisciUtenti_1 = require("./amministrazioneGestisciUtenti");
Object.defineProperty(exports, "amministrazione_gestisciUtenti", { enumerable: true, get: function () { return amministrazioneGestisciUtenti_1.amministrazione_gestisciUtenti; } });
var risorseUmaneGestisciAccessoTecnico_1 = require("./risorseUmaneGestisciAccessoTecnico");
Object.defineProperty(exports, "risorseUmane_gestisciAccessoTecnico", { enumerable: true, get: function () { return risorseUmaneGestisciAccessoTecnico_1.risorseUmane_gestisciAccessoTecnico; } });
var forceAdmin_1 = require("./forceAdmin");
Object.defineProperty(exports, "forceAdmin", { enumerable: true, get: function () { return forceAdmin_1.forceAdmin; } });
var adminGetAllUsers_1 = require("./adminGetAllUsers");
Object.defineProperty(exports, "admin_getAllUsers", { enumerable: true, get: function () { return adminGetAllUsers_1.admin_getAllUsers; } });
var riparaScuderi_1 = require("./riparaScuderi");
Object.defineProperty(exports, "riparaScuderi", { enumerable: true, get: function () { return riparaScuderi_1.riparaScuderi; } });
//# sourceMappingURL=index.js.map