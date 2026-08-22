
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const db = admin.firestore();
const REGION = "europe-west1";

const COLLEZIONI_ANAGRAFICA = [
    "tecnici", "clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata"
];

const serializzaDocumento = (doc: admin.firestore.DocumentSnapshot) => {
    const data = doc.data();
    if (!data) return { id: doc.id };
    const serializedData: { [key: string]: any } = { id: doc.id };
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            serializedData[key] = (value instanceof admin.firestore.Timestamp) ? value.toDate().toISOString() : value;
        }
    }
    return serializedData;
};

export const syncAllAnagrafiche = onCall({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    }
    try {
        logger.info(`Richiesta di sincronizzazione ANAGRAFICHE AGGREGATE per l'utente: ${request.auth.uid}`);
        
        // ** VALIDAZIONE E FORTIFICAZIONE (FASE T.3.B) **
        // Aggiungiamo .where("isDeleted", "!=", true) per garantire che solo i dati attivi
        // vengano sincronizzati con l'app offline, prevenendo dati obsoleti.
        const promises = COLLEZIONI_ANAGRAFICA.map(nomeCollezione => 
            db.collection(nomeCollezione).where("isDeleted", "!=", true).get()
        );

        const snapshots = await Promise.all(promises);
        const tutteLeAnagrafiche: { [key: string]: any[] } = {};
        snapshots.forEach((snapshot, index) => {
            const nomeCollezione = COLLEZIONI_ANAGRAFICA[index];
            tutteLeAnagrafiche[nomeCollezione] = snapshot.docs.map(serializzaDocumento);
        });

        logger.info(`Sincronizzazione aggregata completata. Inviate ${COLLEZIONI_ANAGRAFICA.length} collezioni attive. Inclusi ${tutteLeAnagrafiche.tecnici?.length || 0} tecnici.`);
        return tutteLeAnagrafiche;

    } catch (error) {
        logger.error("Errore durante il recupero aggregato delle anagrafiche:", error);
        throw new HttpsError("internal", "Errore interno durante il recupero dei dati.");
    }
});


export const creaAnagrafica = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    if (request.auth.token.role !== 'admin') {
        throw new HttpsError("permission-denied", "Azione non autorizzata. Solo gli amministratori possono creare anagrafiche.");
    }
    
    const { nomeCollezione, dati } = request.data;
    if (!nomeCollezione || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) throw new HttpsError("invalid-argument", "Nome collezione non valido o dati mancanti.");
    
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const docRef = await db.collection(nomeCollezione).add({ ...dati, createdAt: timestamp, updatedAt: timestamp, isDeleted: false });
        logger.info(`Admin ${request.auth.uid} ha creato un documento in ${nomeCollezione} con ID: ${docRef.id}`);
        return { status: "success", id: docRef.id };
    } catch (error) {
        logger.error(`Errore durante la creazione in ${nomeCollezione}:`, error);
        throw new HttpsError("internal", "Errore interno.");
    }
});

export const aggiornaAnagrafica = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    if (request.auth.token.role !== 'admin') {
        throw new HttpsError("permission-denied", "Azione non autorizzata. Solo gli amministratori possono aggiornare anagrafiche.");
    }

    const { nomeCollezione, docId, dati } = request.data;
    if (!nomeCollezione || !docId || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) throw new HttpsError("invalid-argument", "Nome collezione, ID o dati non validi.");
    
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        await db.collection(nomeCollezione).doc(docId).update({ ...dati, updatedAt: timestamp });
        logger.info(`Admin ${request.auth.uid} ha aggiornato il documento ${docId} in ${nomeCollezione}`);
        return { status: "success" };
    } catch (error) {
        logger.error(`Errore durante l'aggiornamento di ${docId} in ${nomeCollezione}:`, error);
        throw new HttpsError("internal", "Errore interno.");
    }
});

export const eliminaAnagrafica = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    if (request.auth.token.role !== 'admin') throw new HttpsError("permission-denied", "Azione non autorizzata. Solo gli admin possono eliminare.");
    
    const { nomeCollezione, docId } = request.data;
    if (!nomeCollezione || !docId || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) throw new HttpsError("invalid-argument", "Nome collezione o ID non validi.");
    
    try {
        // MODIFICA: Da hard delete a soft delete per coerenza e sicurezza
        await db.collection(nomeCollezione).doc(docId).update({ isDeleted: true, deletedAt: admin.firestore.FieldValue.serverTimestamp() });
        logger.info(`Admin ${request.auth.uid} ha eseguito un soft-delete del documento ${docId} da ${nomeCollezione}`);
        return { status: "success" };
    } catch (error) {
        logger.error(`Errore durante il soft-delete di ${docId} da ${nomeCollezione}:`, error);
        throw new HttpsError("internal", "Errore interno.");
    }
});
