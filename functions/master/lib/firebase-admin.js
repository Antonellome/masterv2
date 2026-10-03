"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messaging = exports.auth = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const messaging_1 = require("firebase-admin/messaging");
// NOTA: Non includere qui le credenziali di servizio, 
// le Cloud Functions le ottengono automaticamente dall'ambiente.
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
exports.db = db;
const auth = (0, auth_1.getAuth)();
exports.auth = auth;
const messaging = (0, messaging_1.getMessaging)();
exports.messaging = messaging;
//# sourceMappingURL=firebase-admin.js.map