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
exports.manageUsers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
try {
    admin.initializeApp();
}
catch (e) {
    // Inizializzazione già avvenuta
}
const db = admin.firestore();
const logAndThrow = (error, message, code = "internal") => {
    console.error(`ERRORE CRITICO in Cloud Function: ${message}`, { error: error.message });
    throw new functions.https.HttpsError(code, message, error.message);
};
const listAllUsers = async () => {
    const allUsers = [];
    let nextPageToken;
    do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        allUsers.push(...listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    return allUsers.map(user => {
        var _a;
        return ({
            uid: user.uid,
            email: user.email || "",
            ruolo: ((_a = user.customClaims) === null || _a === void 0 ? void 0 : _a.role) || 'utente',
            disabled: user.disabled,
        });
    });
};
exports.manageUsers = functions.region("europe-west1").https.onCall(async (data, context) => {
    var _a, _b;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Azione non autorizzata.");
    }
    const { action, payload } = data;
    switch (action) {
        case 'list':
            try {
                const allAuthUsers = await listAllUsers();
                if (!payload || !payload.role)
                    return { users: allAuthUsers };
                const { role } = payload;
                const filteredUsers = role.startsWith('!')
                    ? allAuthUsers.filter(u => u.ruolo !== role.substring(1))
                    : allAuthUsers.filter(u => u.ruolo === role);
                return { users: filteredUsers };
            }
            catch (error) {
                return logAndThrow(error, "Impossibile recuperare la lista utenti.");
            }
        case 'createUser': {
            if (!payload || !payload.email || !payload.nome || !payload.cognome) {
                throw new functions.https.HttpsError('invalid-argument', "Email, nome e cognome sono richiesti per creare un utente.");
            }
            const { email, nome, cognome } = payload;
            try {
                const userRecord = await admin.auth().createUser({ email, displayName: `${nome} ${cognome}` });
                await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'tecnico' });
                return { uid: userRecord.uid, message: `Utente ${email} creato con successo con ruolo tecnico.` };
            }
            catch (error) {
                if (error.code === 'auth/email-already-exists') {
                    throw new functions.https.HttpsError('already-exists', `L\'email ${email} è già in uso.`);
                }
                return logAndThrow(error, "Impossibile creare l'utente.");
            }
        }
        case 'setRole': {
            if (!payload || !payload.uid || !payload.role) {
                throw new functions.https.HttpsError('invalid-argument', "L'UID e il nuovo ruolo sono richiesti.");
            }
            const { uid, role } = payload;
            try {
                await admin.auth().setCustomUserClaims(uid, { role });
                await db.collection('users').doc(uid).set({ ruolo: role }, { merge: true });
                return { message: `Ruolo aggiornato a '${role}' per l'utente ${uid}` };
            }
            catch (error) {
                return logAndThrow(error, "Impossibile aggiornare il ruolo dell'utente.");
            }
        }
        case 'deleteUser': {
            if (!payload || !payload.uid) {
                throw new functions.https.HttpsError('invalid-argument', "L'UID dell'utente è richiesto.");
            }
            const { uid } = payload;
            try {
                await admin.auth().deleteUser(uid);
                await db.collection('users').doc(uid).delete();
                return { message: `Utente ${uid} eliminato con successo.` };
            }
            catch (error) {
                return logAndThrow(error, "Impossibile eliminare l'utente.");
            }
        }
        default: {
            throw new functions.https.HttpsError("unimplemented", `L'azione ('${action}') non è valida.`);
        }
    }
});
//# sourceMappingURL=index.js.map