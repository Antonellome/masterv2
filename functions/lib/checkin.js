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
exports.createCheckin = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const REGION = "europe-west1";
// --- FINE DEFINIZIONE TIPO LOCALE ---
/**
 * Crea un nuovo documento di check-in/out nella collezione `checkin_giornalieri`.
 */
exports.createCheckin = (0, https_1.onCall)({ region: REGION }, async (request) => {
    const { data, auth } = request;
    // 1. CONTROLLO DI SICUREZZA FONDAMENTALE
    if (!auth || auth.uid !== data.tecnicoId) {
        logger.error(`Operazione non autorizzata: UID chiamante [${auth === null || auth === void 0 ? void 0 : auth.uid}] non corrisponde a tecnicoId [${data.tecnicoId}]`, { data });
        throw new https_1.HttpsError("unauthenticated", "Non sei autorizzato a eseguire questa operazione.");
    }
    logger.info(`Richiesta di check-in autorizzata per l'utente: ${auth.uid}`, {
        data,
    });
    // 2. VALIDAZIONE DEI DATI IN INGRESSO
    const tipiValidi = [
        "inizio_giornata",
        "fine_giornata",
        "check_in_luogo",
        "check_out_luogo",
    ];
    if (!tipiValidi.includes(data.tipo)) {
        logger.error(`Tipo di check-in non valido: ${data.tipo}`, { data });
        throw new https_1.HttpsError("invalid-argument", `Il tipo di evento "${data.tipo}" non è valido.`);
    }
    // 3. PREPARAZIONE DEL DOCUMENTO DA SCRIVERE
    const newCheckinData = {
        tecnicoId: data.tecnicoId,
        tecnicoName: data.tecnicoName,
        tipo: data.tipo,
        timestampImpostato: new Date(data.timestampImpostato),
        timestampReale: firestore_1.FieldValue.serverTimestamp(),
    };
    if (data.naveId) {
        newCheckinData.naveId = data.naveId;
    }
    if (data.luogoId) {
        newCheckinData.luogoId = data.luogoId;
    }
    // 4. SCRITTURA SU FIRESTORE
    try {
        const docRef = await (0, firestore_1.getFirestore)()
            .collection("checkin_giornalieri")
            .add(newCheckinData);
        logger.info(`Nuovo check-in creato con successo con ID: ${docRef.id} per utente ${auth.uid}`);
        return { id: docRef.id };
    }
    catch (error) {
        logger.error("Errore durante la scrittura del documento di check-in su Firestore:", { error, data });
        throw new https_1.HttpsError("internal", "Si è verificato un errore interno durante il salvataggio.");
    }
});
//# sourceMappingURL=checkin.js.map