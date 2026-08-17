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
exports.riparaScuderi = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
/**
 * FUNZIONE DI RIPARAZIONE DEFINITIVA E MONOUSO PER ANTONIO SCUDERI.
 * Hardcoded per l'email scuderiantonio@proton.me.
 * Imposta nome, livello staff e admin.
 */
exports.riparaScuderi = functions.region("europe-west1").https.onCall(async (data, context) => {
    const email = "scuderiantonio@proton.me";
    const nomeCorretto = "Antonio Scuderi";
    logger.info(`--- INIZIO RIPARAZIONE DEFINITIVA PER ${email} ---`);
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const { uid } = userRecord;
        const currentClaims = userRecord.customClaims || {};
        logger.info("Step 1: Imposto i Custom Claims corretti...");
        await admin.auth().setCustomUserClaims(uid, Object.assign(Object.assign({}, currentClaims), { livello: 'staff', admin: true }));
        logger.info("Step 1: Custom Claims impostati: { livello: 'staff', admin: true }");
        logger.info("Step 2: Aggiorno il Display Name...");
        await admin.auth().updateUser(uid, {
            displayName: nomeCorretto
        });
        logger.info(`Step 2: Display Name aggiornato a "${nomeCorretto}"`);
        logger.info(`--- RIPARAZIONE COMPLETATA CON SUCCESSO PER ${uid} ---`);
        return {
            status: "success",
            message: `L'utente ${email} è stato riparato con successo. Nome: ${nomeCorretto}, Claims: { livello: 'staff', admin: true }`,
        };
    }
    catch (error) {
        logger.error(`!!! ERRORE CRITICO DURANTE LA RIPARAZIONE DI ${email}:`, error);
        throw new functions.https.HttpsError("internal", `Errore durante la riparazione: ${error.message}`);
    }
});
//# sourceMappingURL=riparaScuderi.js.map