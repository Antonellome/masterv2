
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { db, auth } from "./firebase-admin";

const checkAdmin = async (uid: string) => {
    const user = await auth.getUser(uid);
    if (user.customClaims?.['admin'] !== true) {
        throw new HttpsError("permission-denied", "This operation is restricted to administrators.");
    }
};

export const master_gestisciTecnico = onCall({ region: "europe-west6" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    await checkAdmin(request.auth.uid);

    const operation = request.data.operation ? String(request.data.operation).trim() : null;
    const data = request.data.payload || request.data.data;

    if (!operation || !data) {
        throw new HttpsError("invalid-argument", "Incomplete payload.");
    }

    logger.info(`+++ USING IF/ELSE IF +++ Executing: '${operation}'`);

    if (operation === 'toggle-attivo') {
        logger.info("*** FINALLY INSIDE 'toggle-attivo' BLOCK ***");
        if (!data.id || typeof data.attivo !== 'boolean') {
            throw new HttpsError("invalid-argument", "'id' and 'attivo' (boolean) are required.");
        }
        try {
            await db.collection('tecnici').doc(data.id).update({ attivo: data.attivo });
            // Restore original complex logic
            if (data.attivo === false) {
                 await db.collection('tecnici').doc(data.id).update({ appAccess: false, accessoApp: false });
                 await auth.updateUser(data.id, { disabled: true });
            } else {
                 await auth.updateUser(data.id, { disabled: false });
            }
            return { success: true, message: `Logic with IF/ELSE succeeded for ${data.id}.` };
        } catch(e: any) {
            logger.error(`Error during 'toggle-attivo' execution:`, e);
            throw new HttpsError("internal", e.message);
        }

    } else if (operation === 'toggle-access') {
        logger.info("*** INSIDE 'toggle-access' BLOCK ***");
        if (!data.id || typeof data.appAccess !== 'boolean') {
            throw new HttpsError("invalid-argument", "'id' and 'appAccess' (boolean) are required.");
        }
        const tecnicoDoc = await db.collection('tecnici').doc(data.id).get();
        if (!tecnicoDoc.exists || tecnicoDoc.data()?.attivo === false) {
            throw new HttpsError("failed-precondition", "Cannot change access for an inactive technician.");
        }
        await db.collection('tecnici').doc(data.id).update({ appAccess: data.appAccess, accessoApp: data.appAccess });
        await auth.updateUser(data.id, { disabled: !data.appAccess });
        return { success: true, message: `Access for ${data.id} changed.` };

    } else {
        logger.error(`FATAL: Operation '${operation}' did not match any IF/ELSE branch.`);
        throw new HttpsError("invalid-argument", `Operation '${operation}' is not supported.`);
    }
});

// Ignored functions
export const master_gestisciAnagrafica = onCall({ region: "europe-west6" }, async (request) => { 
    throw new HttpsError("unimplemented", "Function not implemented"); 
});
export const master_resetPasswordTecnico = onCall({ region: "europe-west6" }, async (request) => { 
    throw new HttpsError("unimplemented", "Function not implemented"); 
});
