"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = void 0;
const admin = require("firebase-admin");
// Inizializza l'app solo una volta
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// Esporta le istanze dei servizi che verranno utilizzate in tutta l'applicazione
exports.db = admin.firestore();
exports.auth = admin.auth();
//# sourceMappingURL=firebase-admin.js.map