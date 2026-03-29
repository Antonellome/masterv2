
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

try {
  admin.initializeApp();
} catch (e) {
  // Inizializzazione già avvenuta
}

const db = admin.firestore();

const logAndThrow = (error: any, message: string, code: functions.https.FunctionsErrorCode = "internal"): functions.https.HttpsError => {
    console.error(`ERRORE CRITICO in Cloud Function: ${message}`, { error: error.message });
    throw new functions.https.HttpsError(code, message, error.message);
};

// Funzione per creare un documento utente in Firestore
const createFirestoreUserDocument = async (uid: string, data: { email: string, nome: string, cognome: string, ruolo: string }) => {
    try {
        // UTILIZZA LA COLLEZIONE CORRETTA
        await db.collection('utenti_master').doc(uid).set({
            email: data.email,
            nome: data.nome,
            cognome: data.cognome,
            ruolo: data.ruolo,
        }, { merge: true });
    } catch (error: any) {
        console.error(`Fallimento creazione documento utente in Firestore per UID ${uid}`, error);
    }
};


const listAllUsers = async () => {
    const allAuthUsers: admin.auth.UserRecord[] = [];
    let nextPageToken;
    do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        allAuthUsers.push(...listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    if (allAuthUsers.length === 0) {
        return [];
    }

    // LEGGE DALLA COLLEZIONE CORRETTA
    const userDocRefs = allAuthUsers.map(user => db.collection('utenti_master').doc(user.uid));
    const userDocSnapshots = await db.getAll(...userDocRefs);
    
    const firestoreDataMap = new Map<string, any>();
    userDocSnapshots.forEach(doc => {
        if (doc.exists) {
            firestoreDataMap.set(doc.id, doc.data());
        }
    });

    const mergedUsers = allAuthUsers.map(user => {
        const firestoreData = firestoreDataMap.get(user.uid) || {};
        
        // Meccanismo di auto-riparazione: se il documento non esiste, crealo.
        if (!firestoreDataMap.has(user.uid)) {
            createFirestoreUserDocument(user.uid, {
                email: user.email || '',
                nome: user.displayName || '',
                cognome: '',
                ruolo: 'utente' 
            });
        }
        
        return {
            uid: user.uid,
            email: user.email || "",
            ruolo: firestoreData.ruolo || user.customClaims?.role || 'utente',
            disabled: user.disabled,
            nome: firestoreData.nome || user.displayName || '',
            cognome: firestoreData.cognome || '',
        };
    });

    return mergedUsers;
};

export const manageUsers = functions.region("europe-west1").https.onCall(async (data, context) => {
    if (context.auth?.token?.role !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Azione non autorizzata. Sono necessari i privilegi di amministratore.");
    }

    const { action, payload } = data;

    switch (action) {
        case 'list':
            try {
                const allUsers = await listAllUsers();
                return { users: allUsers };
            } catch (error: any) {
                return logAndThrow(error, "Impossibile recuperare la lista utenti.");
            }

        case 'createUser': {
            if (!payload || !payload.email || !payload.password || !payload.nome || !payload.cognome) {
                throw new functions.https.HttpsError('invalid-argument', "Email, password, nome e cognome sono richiesti.");
            }
            const { email, password, nome, cognome, ruolo = 'utente' } = payload;
            try {
                const userRecord = await admin.auth().createUser({
                    email: email,
                    password: password,
                    displayName: `${nome} ${cognome}`,
                });

                await admin.auth().setCustomUserClaims(userRecord.uid, { role: ruolo });
                await createFirestoreUserDocument(userRecord.uid, { email, nome, cognome, ruolo });

                return { success: true, uid: userRecord.uid, message: `Utente ${email} creato.` };
            } catch (error: any) {
                return logAndThrow(error, `Impossibile creare l'utente ${email}.`);
            }
        }

        case 'setRole': {
            if (!payload || !payload.uid || !payload.role) {
                throw new functions.https.HttpsError('invalid-argument', "L'UID e il nuovo ruolo sono richiesti.");
            }
            const { uid, role } = payload;
            try {
                await admin.auth().setCustomUserClaims(uid, { role });
                // SCRIVE SULLA COLLEZIONE CORRETTA
                await db.collection('utenti_master').doc(uid).set({ ruolo: role }, { merge: true });
                return { message: `Ruolo aggiornato a '${role}' per l'utente ${uid}` };
            } catch (error: any) {
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
                // ELIMINA DALLA COLLEZIONE CORRETTA
                await db.collection('utenti_master').doc(uid).delete();
                return { message: `Utente ${uid} eliminato con successo.` };
            } catch (error: any) {
                return logAndThrow(error, "Impossibile eliminare l'utente.");
            }
        }
        
        default: {
            throw new functions.https.HttpsError("unimplemented", `L'azione ('${action}') non è valida.`);
        }
    }
});
