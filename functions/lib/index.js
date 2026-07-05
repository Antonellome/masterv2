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
exports.createTecnico = exports.executeMigration = exports.forceAdmin = void 0;
const admin = __importStar(require("firebase-admin"));
// Inizializza l'SDK di Admin UNA SOLA VOLTA
admin.initializeApp();
// --- ESPORTAZIONE FUNZIONI PULITE ---
// 1. Esporta la funzione forceAdmin
var forceAdmin_1 = require("./forceAdmin");
Object.defineProperty(exports, "forceAdmin", { enumerable: true, get: function () { return forceAdmin_1.forceAdmin; } });
// 2. Esporta la funzione di migrazione
var migration_1 = require("./migration");
Object.defineProperty(exports, "executeMigration", { enumerable: true, get: function () { return migration_1.executeMigration; } });
// 3. Esporta la funzione per la creazione dei tecnici
var createTecnico_1 = require("./createTecnico");
Object.defineProperty(exports, "createTecnico", { enumerable: true, get: function () { return createTecnico_1.createTecnico; } });
//# sourceMappingURL=index.js.map