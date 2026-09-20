"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.master_resetPasswordTecnico = exports.master_gestisciAnagrafica = exports.master_gestisciTecnico = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const firebase_admin_1 = require("./firebase-admin");
const checkAdmin = async (uid) => {
    var _a;
    const user = await firebase_admin_1.auth.getUser(uid);
    if (((_a = user.customClaims) === null || _a === void 0 ? void 0 : _a['admin']) !== true) {
        throw new https_1.HttpsError("permission-denied", "This operation is restricted to administrators.");
    }
};
exports.master_gestisciTecnico = (0, https_1.onCall)({ region: "europe-west6" }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    await checkAdmin(request.auth.uid);
    const operation = request.data.operation ? String(request.data.operation).trim() : null;
    const data = request.data.payload || request.data.data;
    if (!operation || !data) {
        throw new https_1.HttpsError("invalid-argument", "Incomplete payload.");
    }
    logger.info(`+++ USING IF/ELSE IF +++ Executing: '${operation}'`);
    if (operation === 'toggle-attivo') {
        logger.info("*** FINALLY INSIDE 'toggle-attivo' BLOCK ***");
        if (!data.id || typeof data.attivo !== 'boolean') {
            throw new https_1.HttpsError("invalid-argument", "'id' and 'attivo' (boolean) are required.");
        }
        try {
            await firebase_admin_1.db.collection('tecnici').doc(data.id).update({ attivo: data.attivo });
            // Restore original complex logic
            if (data.attivo === false) {
                await firebase_admin_1.db.collection('tecnici').doc(data.id).update({ appAccess: false, accessoApp: false });
                await firebase_admin_1.auth.updateUser(data.id, { disabled: true });
            }
            else {
                await firebase_admin_1.auth.updateUser(data.id, { disabled: false });
            }
            return { success: true, message: `Logic with IF/ELSE succeeded for ${data.id}.` };
        }
        catch (e) {
            logger.error(`Error during 'toggle-attivo' execution:`, e);
            throw new https_1.HttpsError("internal", e.message);
        }
    }
    else if (operation === 'toggle-access') {
        logger.info("*** INSIDE 'toggle-access' BLOCK ***");
        if (!data.id || typeof data.appAccess !== 'boolean') {
            throw new https_1.HttpsError("invalid-argument", "'id' and 'appAccess' (boolean) are required.");
        }
        const tecnicoDoc = await firebase_admin_1.db.collection('tecnici').doc(data.id).get();
        if (!tecnicoDoc.exists || ((_a = tecnicoDoc.data()) === null || _a === void 0 ? void 0 : _a.attivo) === false) {
            throw new https_1.HttpsError("failed-precondition", "Cannot change access for an inactive technician.");
        }
        await firebase_admin_1.db.collection('tecnici').doc(data.id).update({ appAccess: data.appAccess, accessoApp: data.appAccess });
        await firebase_admin_1.auth.updateUser(data.id, { disabled: !data.appAccess });
        return { success: true, message: `Access for ${data.id} changed.` };
    }
    else {
        logger.error(`FATAL: Operation '${operation}' did not match any IF/ELSE branch.`);
        throw new https_1.HttpsError("invalid-argument", `Operation '${operation}' is not supported.`);
    }
});
// Ignored functions
exports.master_gestisciAnagrafica = (0, https_1.onCall)({ region: "europe-west6" }, async (request) => {
    throw new https_1.HttpsError("unimplemented", "Function not implemented");
});
exports.master_resetPasswordTecnico = (0, https_1.onCall)({ region: "europe-west6" }, async (request) => {
    throw new https_1.HttpsError("unimplemented", "Function not implemented");
});
//# sourceMappingURL=index.js.map