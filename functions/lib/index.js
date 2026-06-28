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
exports.deleteNotificationBatch = exports.sendNotification = exports.manageUsers = exports.manageTecnicoAccess = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
exports.manageTecnicoAccess = (0, https_1.onCall)({ region: "europe-west1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const { uid, action } = request.data;
    if (typeof uid !== "string" || uid.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "L'UID del tecnico non è valido.");
    }
    if (action !== "enable" && action !== "disable") {
        throw new https_1.HttpsError("invalid-argument", "L'azione specificata non è valida. Usare 'enable' o 'disable'.");
    }
    logger.info(`Inizio processo per UID: ${uid}, azione: ${action}`);
    let user;
    try {
        user = await auth.getUser(uid);
    }
    catch (error) {
        logger.error(`Errore during la ricerca dell'utente ${uid}:`, error);
        const firebaseError = error;
        if (firebaseError.code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", `L'utente con UID ${uid} non esiste in Firebase Auth.`);
        }
        throw new https_1.HttpsError("internal", `Errore nella ricerca utente: ${firebaseError.message}`);
    }
    const newDisabledState = action === "disable";
    if (user.disabled !== newDisabledState) {
        try {
            await auth.updateUser(uid, { disabled: newDisabledState });
            logger.info(`Stato di autenticazione per l'utente ${uid} aggiornato a disabled: ${newDisabledState}`);
        }
        catch (updateError) {
            const firebaseError = updateError;
            logger.error(`Errore during l'aggiornamento dell'autenticazione per l'utente ${uid}:`, updateError);
            throw new https_1.HttpsError("internal", `Impossibile aggiornare lo stato di autenticazione: ${firebaseError.message}`);
        }
    }
    else {
        logger.info(`L'utente ${uid} ha già lo stato di autenticazione desiderato (disabled: ${newDisabledState}).`);
    }
    try {
        const tecnicoRef = db.collection("tecnici").doc(uid);
        await tecnicoRef.update({ appAccess: !newDisabledState });
        logger.info(`Documento Firestore ${uid} aggiornato con appAccess: ${!newDisabledState}.`);
    }
    catch (dbError) {
        const firebaseError = dbError;
        logger.error(`Errore during l'aggiornamento di Firestore per l'UID ${uid}:`, dbError);
        throw new https_1.HttpsError("internal", `L'autenticazione è stata aggiornata, ma impossibile aggiornare il database: ${firebaseError.message}`);
    }
    return { success: true, message: `Accesso per l'utente ${uid} è stato ${action === "enable" ? "abilitato" : "disabilitato"}.` };
});
exports.manageUsers = (0, https_1.onCall)({ region: "europe-west1", cors: true }, async (request) => {
    var _a, _b, _c;
    const data = request.data;
    const action = data === null || data === void 0 ? void 0 : data.action;
    const payload = data === null || data === void 0 ? void 0 : data.payload;
    const callerUid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    const usersCollection = db.collection("utenti_master");
    const adminsCollection = db.collection("amministratori");
    if (!action) {
        throw new https_1.HttpsError("invalid-argument", "Azione non specificata.");
    }
    if (action === "promoteToAdmin") {
        if (!callerUid) {
            throw new https_1.HttpsError("unauthenticated", "Devi essere autenticato per auto-promuoverti.");
        }
        const listUsersResult = await auth.listUsers(1000);
        const existingAdmin = listUsersResult.users.find((u) => { var _a; return ((_a = u.customClaims) === null || _a === void 0 ? void 0 : _a.role) === "admin"; });
        if (existingAdmin && existingAdmin.uid !== callerUid) {
            throw new https_1.HttpsError("permission-denied", "Un amministratore esiste già.");
        }
        await auth.setCustomUserClaims(callerUid, { role: "admin" });
        return { status: "success", message: "Complimenti! L'utente è ora il primo amministratore." };
    }
    const isCallerAdmin = ((_c = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.role) === "admin";
    if (!isCallerAdmin) {
        throw new https_1.HttpsError("permission-denied", "Accesso negato. Operazione riservata agli amministratori.");
    }
    switch (action) {
        case "list": {
            try {
                const listUsersResult = await auth.listUsers(1000);
                let users = listUsersResult.users.map((userRecord) => {
                    var _a;
                    return ({
                        uid: userRecord.uid,
                        email: userRecord.email,
                        role: ((_a = userRecord.customClaims) === null || _a === void 0 ? void 0 : _a.role) || "utente",
                    });
                });
                const requestedRole = payload === null || payload === void 0 ? void 0 : payload.role;
                if (requestedRole) {
                    if (requestedRole.startsWith("!")) {
                        const roleToExclude = requestedRole.substring(1);
                        users = users.filter((u) => u.role !== roleToExclude);
                    }
                    else {
                        users = users.filter((u) => u.role === requestedRole);
                    }
                }
                return { users };
            }
            catch (error) {
                const firebaseError = error;
                logger.error("Errore nel listare gli utenti", error);
                throw new https_1.HttpsError("internal", `Errore during il recupero degli utenti: ${firebaseError.message}`);
            }
        }
        case "createUser": {
            if (!(payload === null || payload === void 0 ? void 0 : payload.email) || !(payload === null || payload === void 0 ? void 0 : payload.nome)) {
                throw new https_1.HttpsError("invalid-argument", "Email e nome sono richiesti per creare un utente.");
            }
            try {
                const userRecord = await auth.createUser({
                    email: payload.email,
                    displayName: `${payload.nome} ${payload.cognome || ""}`.trim(),
                });
                await auth.setCustomUserClaims(userRecord.uid, { role: "tecnico" });
                await usersCollection.doc(userRecord.uid).set({
                    nome: payload.nome,
                    cognome: payload.cognome || "",
                    email: payload.email,
                });
                return {
                    status: "success",
                    message: `Utente ${payload.email} creato con successo.`,
                    user: {
                        uid: userRecord.uid,
                        email: userRecord.email,
                        role: "tecnico",
                    },
                };
            }
            catch (error) {
                const firebaseError = error;
                logger.error("Errore nella creazione dell'utente", error);
                if (firebaseError.code === "auth/email-already-exists") {
                    throw new https_1.HttpsError("already-exists", `L'utente con email ${payload.email} esiste già.`);
                }
                throw new https_1.HttpsError("internal", `Errore sconosciuto during la creazione dell'utente: ${firebaseError.message}`);
            }
        }
        case "setRole": {
            const targetUid = payload === null || payload === void 0 ? void 0 : payload.uid;
            const role = payload === null || payload === void 0 ? void 0 : payload.role;
            if (!targetUid || !role) {
                throw new https_1.HttpsError("invalid-argument", "UID utente e nuovo ruolo sono richiesti.");
            }
            try {
                await auth.setCustomUserClaims(targetUid, { role });
                if (role === "admin") {
                    const sourceDoc = await usersCollection.doc(targetUid).get();
                    const sourceData = sourceDoc.exists ? sourceDoc.data() : { uid: targetUid };
                    await adminsCollection.doc(targetUid).set(sourceData || {});
                    await usersCollection.doc(targetUid).delete().catch(() => undefined);
                }
                else {
                    const sourceDoc = await adminsCollection.doc(targetUid).get();
                    const sourceData = sourceDoc.exists ? sourceDoc.data() : { uid: targetUid };
                    await usersCollection.doc(targetUid).set(sourceData || {});
                    await adminsCollection.doc(targetUid).delete().catch(() => undefined);
                }
                return { status: "success", message: "Ruolo aggiornato con successo." };
            }
            catch (error) {
                const firebaseError = error;
                logger.error("Errore nell'impostare il ruolo", error);
                throw new https_1.HttpsError("internal", `Errore during l'aggiornamento del ruolo: ${firebaseError.message}`);
            }
        }
        case "deleteUser": {
            const targetUid = payload === null || payload === void 0 ? void 0 : payload.uid;
            if (!targetUid) {
                throw new https_1.HttpsError("invalid-argument", "L'UID dell'utente è richiesto per l'eliminazione.");
            }
            try {
                await auth.deleteUser(targetUid);
                await usersCollection.doc(targetUid).delete().catch(() => undefined);
                await adminsCollection.doc(targetUid).delete().catch(() => undefined);
                return { status: "success", message: "Utente eliminato con successo." };
            }
            catch (error) {
                const firebaseError = error;
                logger.error("Errore nell'eliminazione dell'utente", error);
                throw new https_1.HttpsError("internal", `Impossibile eliminare l'utente: ${firebaseError.message}`);
            }
        }
        default:
            throw new https_1.HttpsError("invalid-argument", `L'azione richiesta '${action}' non è valida.`);
    }
});
exports.sendNotification = (0, https_1.onCall)({ region: "europe-west1", cors: true }, async (request) => {
    try {
        logger.info(">>> [sendNotification] Inizio esecuzione con dati:", request.data);
        if (!request.auth) {
            throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta per inviare notifiche.");
        }
        const isCallerAdmin = request.auth.token.role === "admin";
        if (!isCallerAdmin) {
            throw new https_1.HttpsError("permission-denied", "Accesso negato. Solo gli amministratori possono inviare notifiche.");
        }
        const { title, body, targetType, targetId, targetName } = request.data;
        if (!title || !body || !targetType) {
            throw new https_1.HttpsError("invalid-argument", "Titolo, corpo e tipo di destinatario sono obbligatori.");
        }
        if ((targetType === "tecnico" || targetType === "categoria" || targetType === "user") && !targetId) {
            throw new https_1.HttpsError("invalid-argument", "L'ID del destinatario è richiesto per tipo 'tecnico', 'user' o 'categoria'.");
        }
        let targetUids = [];
        let targetDescription = "";
        logger.info(`>>> [sendNotification] Determinazione destinatari. Tipo: ${targetType}, ID: ${targetId || 'N/A'}`);
        try {
            if (targetType === "tecnico" || targetType === "user") {
                if (targetId) {
                    targetUids.push(targetId);
                    targetDescription = `Tecnico: ${targetName || targetId}`;
                }
            }
            else if (targetType === "categoria") {
                if (targetId) {
                    const tecniciSnapshot = await db.collection("tecnici").where("categoria", "==", targetId).get();
                    logger.info(`>>> [sendNotification] Query per categoria '${targetId}' ha restituito ${tecniciSnapshot.size} documenti.`);
                    targetUids = tecniciSnapshot.docs.map(doc => doc.id);
                    targetDescription = `Categoria: ${targetName || targetId}`;
                }
            }
            else if (targetType === "tutti") {
                const tecniciSnapshot = await db.collection("tecnici").get();
                logger.info(`>>> [sendNotification] Query per 'tutti' ha restituito ${tecniciSnapshot.size} documenti.`);
                targetUids = tecniciSnapshot.docs.map(doc => doc.id);
                targetDescription = "Tutti i tecnici";
            }
        }
        catch (error) {
            logger.error("Errore nel determinare i destinatari della notifica:", error);
            const firebaseError = error;
            throw new https_1.HttpsError("internal", `Impossibile recuperare l'elenco dei destinatari. Dettagli: ${firebaseError.message}`);
        }
        logger.info(">>> [sendNotification] UIDs destinatari finali:", targetUids);
        if (targetUids.length === 0) {
            logger.warn("Nessun destinatario trovato per la notifica. Uscita anticipata.", { targetType, targetId });
            return { success: true, message: "Nessun destinatario valido trovato. La notifica non è stata inviata." };
        }
        const now = admin.firestore.Timestamp.now();
        const sender = request.auth.token.name || request.auth.token.email || "Admin sconosciuto";
        const BATCH_LIMIT = 490;
        const logRef = db.collection("notificheInviate").doc();
        const batchId = logRef.id; // --- ID UNIVOCO PER IL BATCH ---
        const batchPromises = [];
        logger.info(`>>> [sendNotification] Inizio creazione batch per ${targetUids.length} destinatari. Batch ID: ${batchId}`);
        for (let i = 0; i < targetUids.length; i += BATCH_LIMIT) {
            const chunk = targetUids.slice(i, i + BATCH_LIMIT);
            const batch = db.batch();
            chunk.forEach(uid => {
                const notificaRef = db.collection("notifiche").doc();
                batch.set(notificaRef, {
                    tecnicoId: uid,
                    title,
                    body,
                    createdAt: now,
                    isRead: false,
                    batchId: batchId, // --- AGGIUNTO BATCH ID ---
                });
            });
            batchPromises.push(batch.commit());
        }
        const logData = {
            sender,
            title,
            body,
            sentAt: now,
            target: Object.assign({ type: targetType, description: targetDescription }, (targetId && { id: targetId })),
            recipientsCount: targetUids.length,
            batchId: batchId, // --- AGGIUNTO BATCH ID ---
        };
        const logPromise = logRef.set(logData);
        logger.info(">>> [sendNotification] In attesa del completamento di tutti i batch e del log.");
        try {
            await Promise.all([...batchPromises, logPromise]);
            logger.info(`Notifica inviata con successo a ${targetUids.length} destinatari da ${sender}.`);
            return { success: true, message: `Notifica inviata con successo a ${targetUids.length} destinatari.` };
        }
        catch (error) {
            logger.error("Errore during l'invio dei batch di notifiche:", error);
            throw new https_1.HttpsError("internal", "Errore nell'invio delle notifiche. L'operazione potrebbe non essere completata.");
        }
    }
    catch (error) {
        logger.error("!!! ERRORE GLOBALE NON CATTURATO IN sendNotification !!!", {
            errorMessage: error.message,
            errorStack: error.stack,
            fullError: error,
            requestData: request.data,
        });
        throw new https_1.HttpsError("internal", "Si è verificato un errore critico e non gestito. Controllare i log della funzione per i dettagli.");
    }
});
exports.deleteNotificationBatch = (0, https_1.onCall)({ region: "europe-west1", cors: true }, async (request) => {
    logger.info(">>> [deleteNotificationBatch] Inizio esecuzione con dati:", request.data);
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const isCallerAdmin = request.auth.token.role === "admin";
    if (!isCallerAdmin) {
        throw new https_1.HttpsError("permission-denied", "Solo gli amministratori possono eliminare le notifiche.");
    }
    const { logId, batchId } = request.data;
    if (!logId) {
        throw new https_1.HttpsError("invalid-argument", "L'ID del log è obbligatorio.");
    }
    const batch = db.batch();
    // 1. Aggiungi l'eliminazione del documento di log al batch
    const logRef = db.collection("notificheInviate").doc(logId);
    batch.delete(logRef);
    // 2. Se esiste un batchId, elimina tutte le notifiche corrispondenti
    if (batchId) {
        const notificationsQuery = db.collection("notifiche").where("batchId", "==", batchId);
        try {
            const snapshot = await notificationsQuery.get();
            if (!snapshot.empty) {
                logger.info(`Trovate ${snapshot.size} notifiche individuali da eliminare per il batchId: ${batchId}`);
                snapshot.forEach(doc => batch.delete(doc.ref));
            }
        }
        catch (error) {
            logger.error("Errore durante la query per le notifiche individuali:", error);
            throw new https_1.HttpsError("internal", "Impossibile recuperare le notifiche da eliminare.");
        }
    }
    // 3. Esegui il batch
    try {
        await batch.commit();
        logger.info(`Batch di eliminazione completato con successo per logId: ${logId}`);
        return { success: true, message: "Notifica e riferimenti eliminati con successo." };
    }
    catch (error) {
        logger.error("Errore durante l'esecuzione del batch di eliminazione:", error);
        throw new https_1.HttpsError("internal", "Errore durante l'eliminazione dei dati.");
    }
});
//# sourceMappingURL=index.js.map