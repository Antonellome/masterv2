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
exports.onDocumentoDelete = exports.onDocumentoWritten = exports.onVeicoloDelete = exports.onVeicoloWritten = exports.sendAndFanOutNotification = exports.onTecnicoStatusChange = exports.onUserCreate = exports.createNewUser = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// --- Funzione per creare un nuovo utente ---
exports.createNewUser = functions.https.onCall(async (data, context) => {
    // 1. Verifica che l'utente chiamante sia autenticato
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Devi essere autenticato per eseguire questa operazione.');
    }
    // 2. Verifica che l'utente chiamante sia un amministratore
    const adminUser = await admin.auth().getUser(context.auth.uid);
    const customClaims = adminUser.customClaims || {};
    if (customClaims.ruolo !== 'admin' && context.auth.uid !== 'sm6w10dUiHcEs5p1zdFmWlreKAd2') {
        throw new functions.https.HttpsError('permission-denied', 'Non hai i permessi necessari per creare un utente.');
    }
    // 3. Validazione dei dati ricevuti dal form
    const { nome, email, ruolo } = data;
    if (!nome || !email || !ruolo || !['admin', 'user'].includes(ruolo)) {
        throw new functions.https.HttpsError('invalid-argument', 'I dati forniti (nome, email, ruolo) non sono validi o sono incompleti.');
    }
    try {
        // 4. Creazione dell'utente in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            emailVerified: false,
            disabled: true, // L'utente viene creato disabilitato
        });
        // 5. Impostazione del ruolo tramite Custom Claims
        await admin.auth().setCustomUserClaims(userRecord.uid, { ruolo: ruolo });
        // 6. Salvataggio delle informazioni dell'utente nel database Firestore
        await admin.firestore().collection('utenti_master').doc(userRecord.uid).set({
            nome: nome,
            email: email,
            ruolo: ruolo,
            disabled: true, // Coerente con lo stato di Authentication
        });
        functions.logger.info(`Nuovo utente ${email} (UID: ${userRecord.uid}) creato con successo dall'admin ${adminUser.email}.`);
        // 7. Restituzione di un messaggio e dei dati del nuovo utente al client
        return {
            status: 'success',
            message: 'Utente creato con successo. Ricorda di abilitarlo e di informare l\'utente di usare la funzione "reset password" per il primo accesso.',
            newUser: {
                id: userRecord.uid,
                nome,
                email,
                ruolo,
                disabled: true
            }
        };
    }
    catch (error) {
        functions.logger.error(`Errore during la creazione dell'utente con email ${email}:`, error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Questo indirizzo email è già utilizzato da un altro utente.');
        }
        throw new functions.https.HttpsError('internal', 'Si è verificato un errore interno durante la creazione dell\'utente.');
    }
});
// --- Funzioni Esistenti ---
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    try {
        await admin.auth().updateUser(user.uid, { disabled: true });
        functions.logger.info(`Utente ${user.uid} (${user.email}) disabilitato alla creazione.`);
    }
    catch (error) {
        functions.logger.error(`Errore durante la disabilitazione dell'utente ${user.uid}:`, error);
    }
});
exports.onTecnicoStatusChange = functions.firestore
    .document("tecnici/{tecnicoId}")
    .onUpdate(async (change) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    if (!newData || !previousData)
        return null;
    const uid = newData.uid;
    if (newData.stato === previousData.stato || !uid)
        return null;
    const shouldBeEnabled = newData.stato === "attivo";
    try {
        await admin.auth().updateUser(uid, { disabled: !shouldBeEnabled });
        functions.logger.info(`Stato utente ${uid} aggiornato a disabled: ${!shouldBeEnabled}`);
    }
    catch (error) {
        functions.logger.error(`Errore durante l'aggiornamento dello stato utente ${uid}:`, error);
    }
    return null;
});
exports.sendAndFanOutNotification = functions.firestore
    .document('notificheRichieste/{richiestaId}')
    .onCreate(async (snap) => {
    const richiesta = snap.data();
    const { title, body, to_uids = [], to_categories = [] } = richiesta;
    if (!title || !body) {
        functions.logger.error('Richiesta notifica invalida: titolo o corpo mancanti.');
        return;
    }
    const db = admin.firestore();
    const targetUids = [...to_uids];
    const fcmTokens = [];
    if (to_categories.length > 0) {
        const query = db.collection('tecnici').where('categoria', 'in', to_categories);
        const snapshot = await query.get();
        snapshot.forEach((doc) => {
            const tecnico = doc.data();
            if (tecnico.uid)
                targetUids.push(tecnico.uid);
            if (tecnico.fcmToken)
                fcmTokens.push(tecnico.fcmToken);
        });
    }
    const uidsForTokenFetch = to_uids.filter((uid) => !targetUids.includes(uid));
    if (uidsForTokenFetch.length > 0) {
        const promises = uidsForTokenFetch.map((uid) => db.collection('tecnici').where('uid', '==', uid).limit(1).get());
        const snapshots = await Promise.all(promises);
        snapshots.forEach(snapshot => {
            if (!snapshot.empty) {
                const tecnico = snapshot.docs[0].data();
                if (tecnico.fcmToken)
                    fcmTokens.push(tecnico.fcmToken);
            }
        });
    }
    const uniqueUids = [...new Set(targetUids)];
    const uniqueTokens = [...new Set(fcmTokens)];
    if (uniqueUids.length === 0)
        return;
    const fanOutPromise = (() => {
        const batch = db.batch();
        const notificaPayload = {
            title, body, createdAt: admin.firestore.Timestamp.now(), read: false,
        };
        uniqueUids.forEach(uid => {
            const ref = db.collection('users').doc(uid).collection('notifications').doc();
            batch.set(ref, notificaPayload);
        });
        return batch.commit();
    })();
    const pushPromise = (() => {
        if (uniqueTokens.length === 0)
            return Promise.resolve();
        const message = { notification: { title, body }, tokens: uniqueTokens };
        return admin.messaging().sendMulticast(message);
    })();
    await Promise.all([fanOutPromise, pushPromise]);
});
// --- NUOVE FUNZIONI PER LA GESTIONE DELLE SCADENZE ---
const db = admin.firestore();
const manageScadenza = async (idRiferimento, tipoScadenza, tipoOggetto, descrizione, data) => {
    const scadenzaId = `${idRiferimento}_${tipoScadenza.toLowerCase()}`;
    const scadenzeRef = db.collection('scadenze').doc(scadenzaId);
    if (data && data.toDate() > new Date(0)) { // Data valida
        await scadenzeRef.set({
            descrizione,
            data: data.toDate().toISOString().split('T')[0], // Formato YYYY-MM-DD
            tipo: tipoOggetto,
            idRiferimento
        }, { merge: true });
    }
    else { // Data non valida o non presente
        await scadenzeRef.delete().catch(() => { }); // Ignora se non esiste
    }
};
// --- Funzioni per i VEICOLI ---
exports.onVeicoloWritten = functions.firestore
    .document('veicoli/{veicoloId}')
    .onWrite(async (change) => {
    const veicoloId = change.after.id;
    const data = change.after.data();
    const nomeVeicolo = `${data?.veicolo} (${data?.targa})`;
    if (!change.after.exists)
        return; // Gestito da onDelete
    await manageScadenza(veicoloId, 'Assicurazione', 'Veicoli', `Assicurazione ${nomeVeicolo}`, data?.assicurazione);
    await manageScadenza(veicoloId, 'Bollo', 'Veicoli', `Bollo ${nomeVeicolo}`, data?.bollo);
    await manageScadenza(veicoloId, 'Revisione', 'Veicoli', `Revisione ${nomeVeicolo}`, data?.revisione);
    await manageScadenza(veicoloId, 'Tagliando', 'Veicoli', `Tagliando ${nomeVeicolo}`, data?.tagliando);
});
exports.onVeicoloDelete = functions.firestore
    .document('veicoli/{veicoloId}')
    .onDelete(async (snap) => {
    const veicoloId = snap.id;
    const scadenzeQuery = db.collection('scadenze').where('idRiferimento', '==', veicoloId);
    const snapshot = await scadenzeQuery.get();
    if (snapshot.empty)
        return;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
});
// --- Funzioni per i DOCUMENTI ---
exports.onDocumentoWritten = functions.firestore
    .document('documenti/{documentoId}')
    .onWrite(async (change) => {
    const docId = change.after.id;
    const data = change.after.data();
    if (!change.after.exists)
        return;
    await manageScadenza(docId, 'Documento', 'Documenti', `Scadenza ${data?.nome}`, data?.dataScadenza);
});
exports.onDocumentoDelete = functions.firestore
    .document('documenti/{documentoId}')
    .onDelete(async (snap) => {
    const docId = snap.id;
    const scadenzaId = `${docId}_documento`;
    await db.collection('scadenze').doc(scadenzaId).delete().catch(() => { });
});
//# sourceMappingURL=index.js.map