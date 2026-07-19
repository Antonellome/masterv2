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
exports.runMigrationNow = void 0;
const functions = __importStar(require("firebase-functions"));
const migration_1 = require("./migration");
/**
 * Questo è un trigger HTTP temporaneo e PUBBLICO.
 * Il suo unico scopo è avviare la migrazione.
 * Verrà rimosso subito dopo l'uso.
 */
exports.runMigrationNow = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    functions.logger.info("Trigger di migrazione manuale ricevuto!");
    try {
        const result = await (0, migration_1._doMigrationLogic)();
        res.status(200).send(result);
    }
    catch (error) {
        functions.logger.error("Il trigger di migrazione ha fallito:", error);
        res.status(500).send({ success: false, error: error.message });
    }
});
//# sourceMappingURL=temp_runner.js.map