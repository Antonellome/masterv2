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
exports.admin_getAllUsers = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const REGION = "europe-west1";
/**
 * Funzione per recuperare ESCLUSIVAMENTE gli utenti di amministrazione (staff e admin).
 * Filtra gli utenti per restituire solo quelli con il claim `role` impostato a 'staff' o 'admin'.
 * Richiede privilegi di amministratore.
 */
exports.admin_getAllUsers = (0, https_1.onCall)({ region: REGION }, async (request) => {
    var _a, _b;
    // 1. Controllo di sicurezza: solo gli admin possono chiamare questa funzione.
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.role) !== 'admin') {
        logger.error(`Tentativo non autorizzato di elencare lo staff da UID: ${(_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid}`);
        throw new https_1.HttpsError("permission-denied", "Operazione consentita solo agli amministratori.");
    }
    logger.info(`L'admin ${request.auth.token.email} richiede l'elenco dello staff amministrativo.`);
    try {
        const staffUsers = [];
        let nextPageToken;
        // Cicla attraverso tutti gli utenti paginati
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach(userRecord => {
                const customClaims = (userRecord.customClaims || {});
                const userRole = customClaims.role;
                // **FILTRO CORRETTO: SOLO UTENTI CON RUOLO 'staff' o 'admin'**
                if (userRole === 'staff' || userRole === 'admin') {
                    staffUsers.push({
                        id: userRecord.uid,
                        email: userRecord.email || "N/D",
                        nome: userRecord.displayName || "Non specificato",
                        role: userRole,
                        disabled: userRecord.disabled,
                    });
                }
            });
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
        logger.info(`Restituiti ${staffUsers.length} utenti dello staff.`);
        return staffUsers;
    }
    catch (error) {
        logger.error("Errore durante il recupero dell'elenco dello staff:", error);
        throw new https_1.HttpsError("internal", `Impossibile recuperare l'elenco dello staff: ${error.message}`);
    }
});
//# sourceMappingURL=adminGetAllUsers.js.map