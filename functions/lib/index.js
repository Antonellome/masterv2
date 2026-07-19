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
exports.executeMigration = exports.eliminaTecnico = exports.risorseUmane_gestisciAccessoTecnico = exports.amministrazione_gestisciUtenti = void 0;
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
// Funzioni di migrazione e test (da rimuovere o disabilitare in produzione)
// export { executeMigration } from './migration';
// export { createTecnico } from './createTecnico';
// export { forceAdmin } from './forceAdmin';
// Funzioni di produzione per la gestione degli accessi e degli utenti
var amministrazione_gestisciUtenti_1 = require("./amministrazione-gestisciUtenti");
Object.defineProperty(exports, "amministrazione_gestisciUtenti", { enumerable: true, get: function () { return amministrazione_gestisciUtenti_1.amministrazione_gestisciUtenti; } });
var risorseUmane_gestisciAccessoTecnico_1 = require("./risorseUmane-gestisciAccessoTecnico");
Object.defineProperty(exports, "risorseUmane_gestisciAccessoTecnico", { enumerable: true, get: function () { return risorseUmane_gestisciAccessoTecnico_1.risorseUmane_gestisciAccessoTecnico; } });
var risorseUmane_eliminaTecnico_1 = require("./risorseUmane-eliminaTecnico");
Object.defineProperty(exports, "eliminaTecnico", { enumerable: true, get: function () { return risorseUmane_eliminaTecnico_1.eliminaTecnico; } });
exports.executeMigration = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token.admin) {
        throw new Error("La funzione può essere eseguita solo da un amministratore.");
    }
    const migration = await Promise.resolve().then(() => __importStar(require("./migration")));
    return await migration._doMigrationLogic();
});
//# sourceMappingURL=index.js.map