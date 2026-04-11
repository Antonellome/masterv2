
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

// Inizializzazione Globale
try {
  admin.initializeApp();
} catch (e) {
  logger.info("L'app di admin è già inizializzata.");
}

const db = admin.firestore();
const auth = admin.auth();

// =========================================================================
// === FUNZIONE DI GESTIONE ACCESSI ========================================
// =========================================================================

export const manageAccess = onCall({ region: "europe-west1" }, async (request) => {
    const { action, payload } = request.data;
    const callingUid = request.auth?.uid;

    if (!callingUid) {
        throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    }

    if (!(await isUserAdmin(callingUid))) {
         throw new HttpsError("permission-denied", "Non hai i permessi per eseguire questa operazione.");
    }

    logger.info(`Azione '${action}' richiesta da admin ${callingUid}`, { payload });

    try {
        switch (action) {
            case "createCandidate":
                return await createCandidate(payload);
            case "promoteToAdmin":
                return await promoteToAdmin(payload);
            case "demoteToCandidate":
                if (payload.uid === callingUid) {
                    throw new HttpsError("permission-denied", "Un amministratore non può revocare i propri privilegi.");
                }
                return await demoteToCandidate(payload);
            case "deleteUser":
                 if (payload.uid === callingUid) {
                    throw new HttpsError("permission-denied", "Un amministratore non può eliminare il proprio account.");
                }
                return await deleteUser(payload, payload.fromCollection);
            default:
                throw new HttpsError("invalid-argument", "Azione non valida o non supportata.");
        }
    } catch (error: any) {
        logger.error(`Errore durante l'azione '${action}':`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", `Errore interno durante l'esecuzione di '${action}'.`);
    }
});


// === LOGICA INTERNA DELLE AZIONI ===

async function createCandidate(payload: { email: string; nome: string; }) {
    const { email, nome } = payload;
    if (!email || !nome) {
        throw new HttpsError("invalid-argument", "Email e nome sono obbligatori.");
    }
    
    try {
        const user = await auth.getUserByEmail(email);
        const isAdmin = await db.collection("amministratori").doc(user.uid).get();
        const isCandidate = await db.collection("utenti_master").doc(user.uid).get();
        if (isAdmin.exists || isCandidate.exists) {
            throw new HttpsError("already-exists", "Un utente con questa email esiste già nel sistema.");
        }
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
            throw error; 
        }
    }

    await db.collection("utenti_master").add({ nome, email, dataCreazione: admin.firestore.FieldValue.serverTimestamp() });
    return { status: "success", message: `Candidato ${nome} creato con successo.` };
}

async function promoteToAdmin(payload: { uid: string; }) {
    const { uid } = payload;
    if (!uid) throw new HttpsError("invalid-argument", "UID utente è obbligatorio.");

    const candidateRef = db.collection("utenti_master").doc(uid);
    const candidateDoc = await candidateRef.get();

    if (!candidateDoc.exists) {
        throw new HttpsError("not-found", "Candidato non trovato in utenti_master.");
    }

    const { nome, email } = candidateDoc.data() as { nome: string; email: string };

    let user: admin.auth.UserRecord;
    try {
        user = await auth.getUserByEmail(email);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            user = await auth.createUser({ email, emailVerified: false, displayName: nome, disabled: false });
        } else {
            throw new HttpsError("internal", `Errore Auth: ${error.message}`);
        }
    }

    const adminRef = db.collection("amministratori").doc(user.uid);

    await db.runTransaction(async (transaction) => {
        transaction.delete(candidateRef);
        transaction.set(adminRef, {
            nome,
            email,
            ruolo: 'admin',
            abilitato: true,
            dataCreazione: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await auth.setCustomUserClaims(user.uid, { admin: true });

    return { status: "success", message: `${nome} è stato promosso ad amministratore.` };
}

async function demoteToCandidate(payload: { uid: string; }) {
    const { uid } = payload;
    if (!uid) throw new HttpsError("invalid-argument", "UID utente è obbligatorio.");

    const adminRef = db.collection("amministratori").doc(uid);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists) {
        throw new HttpsError("not-found", "Amministratore non trovato.");
    }

    const { nome, email } = adminDoc.data() as { nome: string; email: string };
    const candidateRef = db.collection("utenti_master").doc(uid);

    await db.runTransaction(async (transaction) => {
        transaction.delete(adminRef);
        transaction.set(candidateRef, { nome, email, dataCreazione: admin.firestore.FieldValue.serverTimestamp() });
    });

    await auth.setCustomUserClaims(uid, { admin: false });

    return { status: "success", message: `Amministratore ${nome} revocato a candidato.` };
}

async function deleteUser(payload: { uid: string }, fromCollection: 'amministratori' | 'utenti_master') {
    const { uid } = payload;
    if (!uid) throw new HttpsError("invalid-argument", "UID utente è obbligatorio.");
    if (!['amministratori', 'utenti_master'].includes(fromCollection)) {
        throw new HttpsError("invalid-argument", "Collezione di origine non valida.");
    }

    await db.collection(fromCollection).doc(uid).delete();

    try {
        await auth.updateUser(uid, { disabled: true });
        await auth.setCustomUserClaims(uid, null);
    } catch (error: any) {
        logger.warn(`L'utente ${uid} era in Firestore ma non in Auth. Pulizia completata.`);
    }
    
    return { status: "success", message: "Utente eliminato con successo." };
}

// === FUNZIONE HELPER ===
async function isUserAdmin(uid: string): Promise<boolean> {
    const adminDoc = await db.collection("amministratori").doc(uid).get();
    return adminDoc.exists;
}
