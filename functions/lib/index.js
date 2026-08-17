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
exports.eliminaTecnico = exports.risorseUmane_gestisciAccessoTecnico = exports.amministrazione_gestisciUtenti = exports.createTecnico = exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = exports.deleteDocument = exports.updateDocument = exports.createDocument = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// --- Funzioni CRUD Generiche (NUOVA ARCHITETTURA) ---
var genericCrud_1 = require("./genericCrud");
Object.defineProperty(exports, "createDocument", { enumerable: true, get: function () { return genericCrud_1.createDocument; } });
Object.defineProperty(exports, "updateDocument", { enumerable: true, get: function () { return genericCrud_1.updateDocument; } });
Object.defineProperty(exports, "deleteDocument", { enumerable: true, get: function () { return genericCrud_1.deleteDocument; } });
// --- FUNZIONI DI BUSINESS SPECIFICHE ---
// Rapportini - API HTTP Completa per App Tecnici e App Master
// Ultima modifica per forzare rebuild: 2024-10-26 11:00
var rapportini_1 = require("./rapportini");
Object.defineProperty(exports, "createRapportino", { enumerable: true, get: function () { return rapportini_1.createRapportino; } });
Object.defineProperty(exports, "updateRapportino", { enumerable: true, get: function () { return rapportini_1.updateRapportino; } });
Object.defineProperty(exports, "deleteRapportino", { enumerable: true, get: function () { return rapportini_1.deleteRapportino; } });
// Gestione Tecnici e Utenti
var createTecnico_1 = require("./createTecnico");
Object.defineProperty(exports, "createTecnico", { enumerable: true, get: function () { return createTecnico_1.createTecnico; } });
var amministrazione_gestisciUtenti_1 = require("./amministrazione-gestisciUtenti");
Object.defineProperty(exports, "amministrazione_gestisciUtenti", { enumerable: true, get: function () { return amministrazione_gestisciUtenti_1.amministrazione_gestisciUtenti; } });
var risorseUmane_gestisciAccessoTecnico_1 = require("./risorseUmane-gestisciAccessoTecnico");
Object.defineProperty(exports, "risorseUmane_gestisciAccessoTecnico", { enumerable: true, get: function () { return risorseUmane_gestisciAccessoTecnico_1.risorseUmane_gestisciAccessoTecnico; } });
var risorseUmane_eliminaTecnico_1 = require("./risorseUmane-eliminaTecnico");
Object.defineProperty(exports, "eliminaTecnico", { enumerable: true, get: function () { return risorseUmane_eliminaTecnico_1.eliminaTecnico; } });
// --- Funzioni obsolete che verranno eliminate con questo deploy ---
// La vecchia 'manageRapportino' non è più esportata, quindi Firebase la rimuoverà.
//# sourceMappingURL=index.js.map