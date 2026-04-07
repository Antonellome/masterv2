
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

try {
  admin.initializeApp();
} catch (e) {
  logger.info("L'app di admin è già inizializzata.");
}

const db = admin.firestore();
const auth = admin.auth();

const fetchCollection = async (collectionName: string) => {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const setAdminClaim = onDocumentCreated({
    document: "amministratori/{uid}",
    region: "europe-west1",
}, async (event) => {
    const { uid } = event.params;
    const snapshot = event.data;

    if (!snapshot) {
        logger.warn(`Evento di creazione per 'amministratori/${uid}' senza dati. Uscita.`);
        return;
    }

    logger.info(`Tentativo di impostare il claim 'admin' per l'utente ${uid}`);

    try {
        await auth.setCustomUserClaims(uid, { role: 'admin' });
        logger.info(`Successo! Il claim 'admin' è stato impostato per l'utente ${uid}.`);
        await db.collection('amministratori').doc(uid).update({ 
            claimImpostato: true, 
            dataImpostazione: admin.firestore.FieldValue.serverTimestamp() 
        });
        return { message: `Claim 'admin' impostato per l'utente ${uid}` };
    } catch (error) {
        logger.error(`ERRORE nell'impostare il claim 'admin' per l'utente ${uid}:`, error);
        const errorMessage = (error instanceof Error) ? error.message : "Errore sconosciuto";
        await db.collection('amministratori').doc(uid).update({ 
            erroreClaim: true, 
            messaggioErrore: errorMessage 
        });
        return { error: errorMessage };
    }
});

export const manageAccess = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth?.token.role || request.auth.token.role !== 'admin') {
        throw new HttpsError("permission-denied", "Azione non autorizzata. Solo gli amministratori possono eseguire questa operazione.");
    }

    const { action, payload } = request.data;

    switch (action) {
        case 'createAdmin': {
            if (!payload || !payload.email || !payload.nome) {
                throw new HttpsError('invalid-argument', "Dati mancanti: richiesti 'email' e 'nome'.");
            }
            const { email, nome } = payload;
            
            try {
                let userRecord;
                try {
                    userRecord = await auth.getUserByEmail(email);
                    logger.info(`Utente ${email} trovato (UID: ${userRecord.uid}). Procedo con la promozione.`);
                } catch (error: any) {
                    if (error.code === 'auth/user-not-found') {
                        logger.info(`Utente ${email} non trovato. Procedo con la creazione.`);
                        userRecord = await auth.createUser({ email, emailVerified: false, disabled: false });
                        logger.info(`Utente ${email} creato con UID: ${userRecord.uid}.`);
                    } else {
                        throw error;
                    }
                }

                const adminDocRef = db.collection('amministratori').doc(userRecord.uid);
                const adminDoc = await adminDocRef.get();

                if (adminDoc.exists) {
                    logger.warn(`Il documento amministratore per UID ${userRecord.uid} esiste già.`);
                } else {
                    await adminDocRef.set({
                        nome: nome,
                        email: email,
                        ruolo: 'admin',
                        abilitato: true,
                        dataCreazione: admin.firestore.FieldValue.serverTimestamp()
                    });
                }

                logger.info(`Documento amministratore per ${nome} (${email}) creato/verificato.`);
                return { success: true, message: `Privilegi di amministratore concessi a ${nome}.` };

            } catch (error: any) {
                logger.error(`Errore durante la concessione dei privilegi a ${email}:`, error);
                throw new HttpsError("internal", `Impossibile concedere i privilegi: ${error.message}`);
            }
        }

        case 'toggleAbilitato': {
             if (!payload || !payload.uid || typeof payload.abilitato !== 'boolean') {
                throw new HttpsError('invalid-argument', "Dati mancanti o non validi. Richiesto 'uid' e 'abilitato'.");
            }
            const { uid, abilitato } = payload;

            try {
                await auth.updateUser(uid, { disabled: !abilitato });
                logger.info(`Stato AUTH per l'utente ${uid} aggiornato a: ${abilitato ? 'abilitato' : 'disabilitato'}.`);

                // SOLUZIONE DEFINITIVA: Uso .set con { merge: true } per creare il documento se non esiste.
                await db.collection('tecnici').doc(uid).set({ abilitato: abilitato }, { merge: true });
                logger.info(`Documento Firestore per tecnico ${uid} aggiornato/creato con stato: ${abilitato}.`);

                return { success: true, message: `Stato tecnico ${uid} aggiornato con successo.` };

            } catch (error: any) {
                logger.error(`Errore durante l'aggiornamento dello stato per il tecnico ${uid}:`, error);
                throw new HttpsError("internal", `Impossibile aggiornare lo stato dell'utente: ${error.message}`);
            }
        }

        default: {
            throw new HttpsError("unimplemented", `L'azione '${action}' non è supportata da manageAccess.`);
        }
    }
});

export const getMasterData = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth?.token.role) {
        throw new HttpsError("permission-denied", "Autenticazione richiesta per leggere i dati.");
    }
    
    if (request.auth.token.role !== 'admin' && request.auth.token.role !== 'tecnico') {
        throw new HttpsError("permission-denied", "Permessi insufficienti. Solo un amministratore o un tecnico può leggere i dati anagrafici.");
    }

    try {
        const collectionsToFetch = ['clienti', 'ditte', 'navi', 'luoghi', 'categorie', 'tipi-giornata', 'tecnici', 'veicoli'];
        const results = await Promise.all(collectionsToFetch.map(fetchCollection));
        const allData: { [key: string]: any[] } = {};
        collectionsToFetch.forEach((name, index) => { allData[name] = results[index]; });
        return allData;
    } catch (error) {
        logger.error("Errore critico durante il recupero dei dati anagrafici:", error);
        throw new HttpsError("internal", "Impossibile recuperare i dati anagrafici.");
    }
});
