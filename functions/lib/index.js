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
exports.eliminaTecnico = exports.risorseUmane_gestisciAccessoTecnico = exports.amministrazione_gestisciUtenti = exports.createTecnico = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Funzioni di migrazione e test (da rimuovere o disabilitare in produzione)
// export { executeMigration } from './migration';
var createTecnico_1 = require("./createTecnico");
Object.defineProperty(exports, "createTecnico", { enumerable: true, get: function () { return createTecnico_1.createTecnico; } });
// export { forceAdmin } from './forceAdmin';
// Funzioni di produzione per la gestione degli accessi e degli utenti
var amministrazione_gestisciUtenti_1 = require("./amministrazione-gestisciUtenti");
Object.defineProperty(exports, "amministrazione_gestisciUtenti", { enumerable: true, get: function () { return amministrazione_gestisciUtenti_1.amministrazione_gestisciUtenti; } });
var risorseUmane_gestisciAccessoTecnico_1 = require("./risorseUmane-gestisciAccessoTecnico");
Object.defineProperty(exports, "risorseUmane_gestisciAccessoTecnico", { enumerable: true, get: function () { return risorseUmane_gestisciAccessoTecnico_1.risorseUmane_gestisciAccessoTecnico; } });
var risorseUmane_eliminaTecnico_1 = require("./risorseUmane-eliminaTecnico"); // <-- Funzione aggiunta
Object.defineProperty(exports, "eliminaTecnico", { enumerable: true, get: function () { return risorseUmane_eliminaTecnico_1.eliminaTecnico; } });
//# sourceMappingURL=index.js.map