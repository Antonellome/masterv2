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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = exports.getAllRapportiniForSync = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
const db = admin.firestore();
const messaging = admin.messaging();
const REGION = "europe-west1";
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const toDateRobust = (timestamp, docId, fieldName, fallbackDate = null) => {
    if (!timestamp)
        return fallbackDate;
    if (timestamp.toDate)
        return timestamp.toDate();
    const d = new Date(timestamp);
    if (!isNaN(d.getTime()))
        return d;
    firebase_functions_1.logger.warn(`toDateRobust: Formato data non valido per ${docId}, campo '${fieldName}'. Valore: ${JSON.stringify(timestamp)}`);
    return fallbackDate;
};
const sendRapportinoNotifications = async (creatorId, participantIds, rapportinoDate, creatorName) => {
    var _a;
    if (!participantIds || participantIds.length === 0)
        return;
    const otherParticipantIds = participantIds.filter(id => id !== creatorId);
    if (otherParticipantIds.length === 0)
        return;
    try {
        let finalCreatorName = creatorName;
        if (!finalCreatorName) {
            const creatorDoc = await db.collection("tecnici").doc(creatorId).get();
            finalCreatorName = creatorDoc.exists ? (_a = creatorDoc.data()) === null || _a === void 0 ? void 0 : _a.nome : "un collega";
        }
        const usersSnapshot = await db.collection("tecnici").where(admin.firestore.FieldPath.documentId(), "in", otherParticipantIds).get();
        const tokens = usersSnapshot.docs.map(doc => doc.data().fcmToken).filter(Boolean);
        if (tokens.length > 0) {
            const dateString = rapportinoDate ? rapportinoDate.toLocaleDateString('it-IT') : 'N/D';
            const message = {
                notification: {
                    title: "Nuova Collaborazione",
                    body: `Sei stato aggiunto al rapportino di ${finalCreatorName} del ${dateString}.`
                },
                tokens: tokens,
            };
            await messaging.sendMulticast(message);
            firebase_functions_1.logger.info(`Notifiche di collaborazione inviate con successo.`);
        }
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore in sendRapportinoNotifications:", error);
    }
};
// =============================================================================
// CRUD FUNCTIONS (FASE R.5 - ISO STRING DATES)
// =============================================================================
exports.getAllRapportiniForSync = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    const { uid } = request.auth;
    const { lastSyncTimestamp } = request.data;
    try {
        let queryTecnico = db.collection("rapportini").where("tecnicoId", "==", uid);
        let queryPresenze = db.collection("rapportini").where("presenze", "array-contains", uid);
        if (lastSyncTimestamp && typeof lastSyncTimestamp === 'number' && lastSyncTimestamp > 0) {
            const syncDate = new Date(lastSyncTimestamp);
            queryTecnico = queryTecnico.where("updatedAt", ">", syncDate);
            queryPresenze = queryPresenze.where("updatedAt", ">", syncDate);
        }
        const [tecnicoSnap, presenzeSnap] = await Promise.all([queryTecnico.get(), queryPresenze.get()]);
        const allRapportiniMap = new Map();
        const processSnapshot = (snapshot) => {
            snapshot.docs.forEach(doc => {
                var _a, _b, _c;
                if (allRapportiniMap.has(doc.id))
                    return;
                const docData = doc.data();
                const finalData = toDateRobust(docData.data, doc.id, 'data') ||
                    toDateRobust(docData.dataInizio, doc.id, 'dataInizio') ||
                    toDateRobust(docData.createdAt, doc.id, 'createdAt', new Date());
                if (!finalData) {
                    firebase_functions_1.logger.warn(`Documento ${doc.id} scartato: nessuna data valida trovata.`);
                    return;
                }
                const cleanRapportino = {
                    id: doc.id,
                    data: finalData.toISOString(), // *** THE FIX ***
                    dataFine: ((_a = toDateRobust(docData.dataFine, doc.id, 'dataFine')) === null || _a === void 0 ? void 0 : _a.toISOString()) || null,
                    tecnicoId: docData.tecnicoId || null,
                    presenze: docData.presenze || [],
                    tipoGiornataId: docData.tipoGiornataId || null,
                    includeTrasferta: !!docData.includeTrasferta,
                    lavoroEseguito: docData.lavoroEseguito || '',
                    dettaglioOreTecnici: docData.dettaglioOreTecnici || [],
                    trasfertaId: docData.trasfertaId || null,
                    naveId: docData.naveId || null,
                    luogoId: docData.luogoId || null,
                    veicoloId: docData.veicoloId || null,
                    descrizioneBreve: docData.descrizioneBreve || '',
                    materialiImpiegati: docData.materialiImpiegati || '',
                    ordineLavoro: docData.ordineLavoro || '',
                    firmaFirmatarioNome: docData.firmaFirmatarioNome || '',
                    firmaFirmatarioSocieta: docData.firmaFirmatarioSocieta || '',
                    firmaVettoriale: docData.firmaVettoriale || null,
                    createdAt: ((_b = toDateRobust(docData.createdAt, doc.id, 'createdAt', finalData)) === null || _b === void 0 ? void 0 : _b.toISOString()) || finalData.toISOString(),
                    createdBy: docData.createdBy || null,
                    updatedAt: ((_c = toDateRobust(docData.updatedAt, doc.id, 'updatedAt', finalData)) === null || _c === void 0 ? void 0 : _c.toISOString()) || finalData.toISOString(),
                    updatedBy: docData.updatedBy || null,
                    isLocked: !!docData.isLocked,
                    version: docData.version || 1,
                    isDeleted: !!docData.isDeleted,
                };
                allRapportiniMap.set(doc.id, cleanRapportino);
            });
        };
        processSnapshot(tecnicoSnap);
        processSnapshot(presenzeSnap);
        const rapportini = Array.from(allRapportiniMap.values());
        firebase_functions_1.logger.info(`FASE R.5 -> Sync per ${uid}: ${rapportini.length} rapportini puliti (con date ISO) pronti per l'invio.`);
        return { data: rapportini };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore critico in getAllRapportiniForSync per l'utente ${uid}:`, error);
        throw new https_1.HttpsError("internal", "Errore durante il recupero dei dati di sincronizzazione.");
    }
});
exports.createRapportino = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    const rawData = request.data;
    const creatorId = request.auth.uid;
    firebase_functions_1.logger.info(`FASE R.5 -> createRapportino chiamato da ${creatorId} con:`, { rawData });
    try {
        const rapportinoData = toDateRobust(rawData.data, 'new_doc', 'data', new Date());
        if (!rapportinoData) {
            throw new https_1.HttpsError("invalid-argument", "Il campo 'data' fornito non è valido.");
        }
        const payload = Object.assign(Object.assign({}, rawData), { data: rapportinoData, tecnicoId: rawData.tecnicoId || creatorId, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: creatorId, updatedBy: creatorId, isDeleted: false, version: 1 });
        delete payload.dataInizio;
        delete payload.dettaglioOre;
        const docRef = await db.collection("rapportini").add(payload);
        firebase_functions_1.logger.info(`FASE R.5 -> Rapportino creato con ID: ${docRef.id}`);
        await sendRapportinoNotifications(creatorId, payload.presenze, rapportinoData, request.auth.token.name);
        return { status: "success", id: docRef.id };
    }
    catch (error) {
        firebase_functions_1.logger.error("Errore creazione rapportino:", error, { data: rawData });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno nel salvataggio del rapportino.");
    }
});
exports.updateRapportino = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "L'utente non è autenticato.");
    const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
    if (!id)
        throw new https_1.HttpsError("invalid-argument", "ID rapportino non fornito.");
    firebase_functions_1.logger.info(`FASE R.5 -> updateRapportino chiamato per ID: ${id}`, { data });
    const rapportinoRef = db.collection("rapportini").doc(id);
    try {
        const payload = Object.assign(Object.assign({}, data), { updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: request.auth.uid });
        if (data.data) {
            const newDate = toDateRobust(data.data, id, 'data');
            if (newDate)
                payload.data = newDate;
        }
        delete payload.dataInizio;
        delete payload.dettaglioOre;
        await rapportinoRef.update(payload);
        firebase_functions_1.logger.info(`FASE R.5 -> Rapportino ${id} aggiornato con successo.`);
        if (data.presenze) {
            const docSnap = await rapportinoRef.get();
            const originalData = docSnap.data();
            if (originalData) {
                await sendRapportinoNotifications(originalData.createdBy, data.presenze, toDateRobust(payload.data || originalData.data, id, 'data'));
            }
        }
        return { status: "success", success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore aggiornamento rapportino ${id}:`, error, { data });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno durante l'aggiornamento.");
    }
});
exports.deleteRapportino = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Utente non autenticato.");
    const claims = request.auth.token;
    if (claims.role !== 'admin' && claims.role !== 'superadmin') {
        throw new https_1.HttpsError("permission-denied", "Solo gli amministratori possono eliminare.");
    }
    const { rapportinoId } = request.data;
    if (!rapportinoId)
        throw new https_1.HttpsError("invalid-argument", "ID rapportino non fornito.");
    try {
        await db.collection('rapportini').doc(rapportinoId).update({
            isDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: request.auth.uid
        });
        firebase_functions_1.logger.info(`FASE R.5 -> Rapportino ${rapportinoId} marcato come eliminato da ${request.auth.uid}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Errore soft-delete ${rapportinoId}:`, error);
        throw new https_1.HttpsError("internal", "Errore interno durante l'eliminazione.");
    }
});
//# sourceMappingURL=rapportini.js.map