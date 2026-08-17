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
exports.deleteDocument = exports.updateDocument = exports.createDocument = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Funzione di utility per verificare i permessi di amministratore
const checkAdmin = async (uid) => {
    var _a;
    const user = await admin.auth().getUser(uid);
    return ((_a = user.customClaims) === null || _a === void 0 ? void 0 : _a.admin) === true;
};
// Funzione generica per creare un documento
exports.createDocument = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const isAdmin = await checkAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin to create a document.');
    }
    const { collection, docData } = data;
    try {
        const docRef = await admin.firestore().collection(collection).add(docData);
        return { id: docRef.id };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Could not create document.', error);
    }
});
// Funzione generica per aggiornare un documento
exports.updateDocument = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be in called while authenticated.');
    }
    const isAdmin = await checkAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin to update a document.');
    }
    const { collection, docId, docData } = data;
    try {
        await admin.firestore().collection(collection).doc(docId).update(docData);
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Could not update document.', error);
    }
});
// Funzione generica per eliminare un documento
exports.deleteDocument = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const isAdmin = await checkAdmin(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin to delete a document.');
    }
    const { collection, docId } = data;
    try {
        await admin.firestore().collection(collection).doc(docId).delete();
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Could not delete document.', error);
    }
});
//# sourceMappingURL=genericCrud.js.map