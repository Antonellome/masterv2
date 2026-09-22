
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { db, auth } from "./firebase-admin";

const checkAdmin = async (uid: string) => {
    const user = await auth.getUser(uid);
    if (user.customClaims?.['admin'] !== true) {
        throw new HttpsError("permission-denied", "This operation is restricted to administrators.");
    }
};

export const master_gestisciTecnico = onCall({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    await checkAdmin(request.auth.uid);

    const operation = request.data.operation ? String(request.data.operation).trim() : null;
    const data = request.data.payload || request.data.data;

    if (!operation || !data) {
        throw new HttpsError("invalid-argument", "Incomplete payload.");
    }

    logger.info(`[master_gestisciTecnico] Executing: '${operation}' with payload:`, data);

    // --- LOGICA DI CREAZIONE --- 
    if (operation === 'add') {
        if (!data.email || !data.password || !data.nome || !data.cognome) {
            throw new HttpsError("invalid-argument", "Email, password, nome, and cognome are required for creation.");
        }
        try {
            const newUserRecord = await auth.createUser({
                email: data.email,
                password: data.password,
                displayName: `${data.nome} ${data.cognome}`,
                disabled: false,
            });

            const { password, ...firestoreData } = data; 
            const dataToSave = {
                ...firestoreData,
                id: newUserRecord.uid, 
                attivo: true, 
                appAccess: true, 
                accessoApp: true, 
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // +++ LOG DI DEBUG AGGIUNTO +++
            logger.info("[master_gestisciTecnico] Attempting to save data to Firestore:", dataToSave);

            await db.collection('tecnici').doc(newUserRecord.uid).set(dataToSave);

            logger.info(`Successfully created user ${newUserRecord.uid}`);
            return { success: true, id: newUserRecord.uid };

        } catch (e: any) {
            // +++ LOG DI DEBUG AGGIUNTO +++
            logger.error(`Error during 'add' execution. Full error object:`, e);
            throw new HttpsError("internal", e.message);
        }
    
    // --- LOGICA DI AGGIORNAMENTO ---
    } else if (operation === 'update') {
        if (!data.id) {
            throw new HttpsError("invalid-argument", "'id' is required for update.");
        }
        try {
            const { id, password, ...updateData } = data; 
            await db.collection('tecnici').doc(id).update({
                ...updateData,
                updatedAt: new Date(),
            });

            if (updateData.email) {
                await auth.updateUser(id, { email: updateData.email });
            }
            
            logger.info(`Successfully updated technician ${id}`);
            return { success: true, id: id };

        } catch (e: any) {
            logger.error(`Error during 'update' execution:`, e);
            throw new HttpsError("internal", e.message);
        }

    // --- LOGICA DI STATO --- 
    } else if (operation === 'toggle-attivo') {
        if (!data.id || typeof data.attivo !== 'boolean') {
            throw new HttpsError("invalid-argument", "'id' and 'attivo' (boolean) are required.");
        }
        try {
            await db.collection('tecnici').doc(data.id).update({ attivo: data.attivo, updatedAt: new Date() });
            if (data.attivo === false) {
                 await db.collection('tecnici').doc(data.id).update({ appAccess: false, accessoApp: false });
                 await auth.updateUser(data.id, { disabled: true });
            } else {
                 await auth.updateUser(data.id, { disabled: false });
            }
            return { success: true };
        } catch(e: any) {
            logger.error(`Error during 'toggle-attivo' execution:`, e);
            throw new HttpsError("internal", e.message);
        }

    // --- LOGICA DI ACCESSO ---
    } else if (operation === 'toggle-access') {
        if (!data.id || typeof data.appAccess !== 'boolean') {
            throw new HttpsError("invalid-argument", "'id' and 'appAccess' (boolean) are required.");
        }
        const tecnicoDoc = await db.collection('tecnici').doc(data.id).get();
        if (!tecnicoDoc.exists || tecnicoDoc.data()?.attivo === false) {
            throw new HttpsError("failed-precondition", "Cannot change access for an inactive technician.");
        }
        await db.collection('tecnici').doc(data.id).update({ appAccess: data.appAccess, accessoApp: data.appAccess, updatedAt: new Date() });
        await auth.updateUser(data.id, { disabled: !data.appAccess });
        return { success: true };

    } else {
        logger.error(`FATAL: Operation '${operation}' did not match any IF/ELSE branch.`);
        throw new HttpsError("invalid-argument", `Operation '${operation}' is not supported.`);
    }
});

// Ignored functions
export const master_gestisciAnagrafica = onCall({ region: "europe-west6" }, async (request) => { 
    throw new HttpsError("unimplemented", "Function not implemented."); 
});
export const master_resetPasswordTecnico = onCall({ region: "europe-west6" }, async (request) => { 
    throw new HttpsError("unimplemented", "Function not implemented."); 
});
