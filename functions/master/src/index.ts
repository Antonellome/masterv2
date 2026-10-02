
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { db, auth } from "./firebase-admin";

// Helper function to check for admin privileges
const checkAdmin = async (uid: string) => {
    const user = await auth.getUser(uid);
    const customClaims = (user.customClaims || {}) as { admin?: boolean };
    if (customClaims.admin !== true) {
        logger.warn(`User ${uid} attempted an admin action without privileges.`);
        throw new HttpsError("permission-denied", "This operation is restricted to administrators.");
    }
};

// ===============================================================================================
// FUNZIONI PER GESTIONE AMMINISTRATORI (CORRETTE)
// ===============================================================================================

/**
 * Recupera l'elenco dei soli utenti del pannello (non i tecnici).
 * Filtra gli utenti in base all'esistenza del custom claim 'admin'.
 * Richiede privilegi di amministratore.
 */
export const admin_getAllUsers = onCall({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);

    try {
        const listUsersResult = await auth.listUsers();
        // FILTRA E MAPPA:
        // 1. Filtra per tenere SOLO gli utenti che hanno il claim 'admin' definito.
        //    Questo esclude i tecnici, che non hanno questo claim.
        // 2. Mappa i dati per il frontend.
        const users = listUsersResult.users
            .filter(user => {
                const customClaims = (user.customClaims || {}) as { admin?: any };
                return customClaims.admin !== undefined;
            })
            .map(user => {
                const customClaims = (user.customClaims || {}) as { admin?: boolean };
                return {
                    id: user.uid,
                    nome: user.displayName || 'Nome non disponibile',
                    email: user.email || 'Email non disponibile',
                    ruolo: customClaims.admin === true ? 'admin' : 'user',
                };
            });
            
        logger.info(`[admin_getAllUsers] Found ${users.length} panel users for admin ${request.auth.uid}.`);
        return users;

    } catch (e: any) {
        logger.error(`[admin_getAllUsers] Critical error while fetching users:`, e);
        throw new HttpsError("internal", e.message || "An internal server error occurred while fetching the user list.");
    }
});


/**
 * Gestisce le operazioni CRUD sugli utenti (Creazione, Aggiornamento, Eliminazione, Cambio Ruolo).
 * Richiede privilegi di amministratore.
 */
export const amministrazione_gestisciUtenti = onCall({ region: "europe-west6", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    await checkAdmin(request.auth.uid);

    const { action, ...data } = request.data;

    logger.info(`[amministrazione_gestisciUtenti] Received action: \'${action}\'`, { data });

    try {
        switch (action) {
            case 'createUser': {
                const { email, nome, password } = data;
                if (!email || !nome || !password) {
                    throw new HttpsError("invalid-argument", "Email, nome, and password are required for user creation.");
                }
                const newUserRecord = await auth.createUser({ email, password, displayName: nome });
                // I nuovi utenti nascono come utenti standard (NON admin) del pannello.
                // Questo claim 'admin' li distingue dai tecnici.
                await auth.setCustomUserClaims(newUserRecord.uid, { admin: false });
                logger.info(`User ${newUserRecord.uid} created successfully by ${request.auth.uid}.`);
                return { success: true, id: newUserRecord.uid };
            }

            case 'updateUser': {
                const { uid, nome: newName } = data;
                if (!uid || !newName) {
                    throw new HttpsError("invalid-argument", "User UID and a new name (nome) are required for update.");
                }
                await auth.updateUser(uid, { displayName: newName });
                logger.info(`User ${uid} was updated by ${request.auth.uid}.`);
                return { success: true };
            }

            case 'deleteUser': {
                const { uid: deleteUid } = data;
                if (!deleteUid) {
                    throw new HttpsError("invalid-argument", "User UID is required for deletion.");
                }
                if (deleteUid === request.auth.uid) {
                    throw new HttpsError("permission-denied", "Administrators cannot delete their own account.");
                }
                await auth.deleteUser(deleteUid);
                logger.info(`User ${deleteUid} was deleted by ${request.auth.uid}.`);
                return { success: true };
            }

            case 'toggleRole': {
                const { uid: roleUid, role } = data;
                if (!roleUid || (role !== 'admin' && role !== 'user')) {
                    throw new HttpsError("invalid-argument", "User UID and a valid role ('admin' or 'user') are required.");
                }
                if (roleUid === request.auth.uid) {
                    throw new HttpsError("permission-denied", "Administrators cannot change their own role.");
                }
                await auth.setCustomUserClaims(roleUid, { admin: role === 'admin' });
                logger.info(`Role for user ${roleUid} was changed to \'${role}\' by ${request.auth.uid}.`);
                return { success: true };
            }

            default:
                logger.warn(`[amministrazione_gestisciUtenti] Unsupported action called: \'${action}\'`);
                throw new HttpsError("invalid-argument", `The action \'${action}\' is not supported.`);
        }
    } catch (e: any) {
        logger.error(`[amministrazione_gestisciUtenti] Critical error on action \'${action}\'':`, e);
        throw new HttpsError("internal", e.message || `An internal error occurred while performing the action: ${action}.`);
    }
});


// ===============================================================================================
// FUNZIONI ESISTENTI (Lasciate intatte)
// ===============================================================================================

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

    logger.info(`[master_gestisciTecnico] Executing: \'${operation}\' with payload:`, data);

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

            // I tecnici NON hanno il claim 'admin'

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

            await db.collection('tecnici').doc(newUserRecord.uid).set(dataToSave);

            logger.info(`Successfully created technician ${newUserRecord.uid}`);
            return { success: true, id: newUserRecord.uid };

        } catch (e: any) {
            logger.error(`Error during \'add\' execution:`, e);
            throw new HttpsError("internal", e.message);
        }

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
            logger.error(`Error during \'update\' execution:`, e);
            throw new HttpsError("internal", e.message);
        }

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
            logger.error(`Error during \'toggle-attivo\' execution:`, e);
            throw new HttpsError("internal", e.message);
        }

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
        logger.error(`FATAL: Operation \'${operation}\' did not match any IF/ELSE branch.`);
        throw new HttpsError("invalid-argument", `Operation \'${operation}\' is not supported.`);
    }
});

// Ignored functions
export const master_gestisciAnagrafica = onCall({ region: "europe-west6" }, async (request) => {
    throw new HttpsError("unimplemented", "Function not implemented.");
});
export const master_resetPasswordTecnico = onCall({ region: "europe-west6" }, async (request) => {
    throw new HttpsError("unimplemented", "Function not implemented.");
});
