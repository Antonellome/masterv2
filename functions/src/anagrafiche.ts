
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const db = admin.firestore();
const REGION = "europe-west1";

const COLLEZIONI_ANAGRAFICA = [
    "tecnici", "clienti", "navi", "luoghi", "ditte", "categorie", "veicoli", "tipiGiornata"
];

// Funzione di serializzazione che converte i documenti Firestore, inclusi i Timestamp,
// in oggetti JSON puliti pronti per essere inviati al client.
const serializzaDocumento = (doc: admin.firestore.DocumentSnapshot) => {
    const data = doc.data();
    if (!data) return { id: doc.id }; // Gestisce il caso di documenti senza dati
    
    const serializedData: { [key: string]: any } = { id: doc.id };
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            // Converte i Timestamp in stringhe ISO 8601, un formato JSON standard e robusto.
            serializedData[key] = (value instanceof admin.firestore.Timestamp) ? value.toDate().toISOString() : value;
        }
    }
    return serializedData;
};


// ==========================================================================================
// FUNZIONE DI SINCRONIZZAZIONE ANAGRAFICHE (RICOSTRUZIONE N.2 - FASE N del Blueprint)
// OBIETTIVO: Correggere la struttura della risposta per allinearla a come il client (SyncService)
// si aspetta di ricevere i dati, risolvendo il bug dei "0 tecnici trovati".
// ==========================================================================================
export const syncAllAnagrafiche = onCall({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    }

    try {
        logger.info(`Richiesta di sincronizzazione ANAGRAFICHE AGGREGATE per l'utente: ${request.auth.uid}`);
        const promises = COLLEZIONI_ANAGRAFICA.map(nomeCollezione => db.collection(nomeCollezione).get());
        const snapshots = await Promise.all(promises);

        const tutteLeAnagrafiche: { [key: string]: any[] } = {};
        snapshots.forEach((snapshot, index) => {
            const nomeCollezione = COLLEZIONI_ANAGRAFICA[index];
            tutteLeAnagrafiche[nomeCollezione] = snapshot.docs.map(serializzaDocumento);
        });

        logger.info(`Sincronizzazione aggregata completata. Inviate ${COLLEZIONI_ANAGRAFICA.length} collezioni. Inclusi ${tutteLeAnagrafiche.tecnici?.length || 0} tecnici.`);

        // ====================================================================================
        //  ** LA CORREZIONE CRUCIALE **
        // Restituiamo l'oggetto `tutteLeAnagrafiche` DIRETTAMENTE. Il wrapper `onCall` di 
        // Firebase Functions V2 lo avvolgerà automaticamente in un oggetto `{ data: ... }`.
        // Il codice precedente restituiva `{ data: tutteLeAnagrafiche }`, causando un doppio 
        // avvolgimento (`{ data: { data: ... } }`) che il client non sapeva gestire.
        // ====================================================================================
        return tutteLeAnagrafiche;

    } catch (error) {
        logger.error("Errore durante il recupero aggregato delle anagrafiche:", error);
        throw new HttpsError("internal", "Errore interno durante il recupero dei dati.");
    }
});


// ===========================================================================
// ALTRE FUNZIONI CRUD (MANTENUTE PER INTEGRITÀ)
// ===========================================================================

export const creaAnagrafica = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    const { nomeCollezione, dati } = request.data;
    if (!nomeCollezione || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) throw new HttpsError("invalid-argument", "Nome collezione non valido o dati mancanti.");
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const docRef = await db.collection(nomeCollezione).add({ ...dati, createdAt: timestamp, updatedAt: timestamp });
        logger.info(`Utente ${request.auth.uid} ha creato un documento in ${nomeCollezione} con ID: ${docRef.id}`);
        return { status: "success", id: docRef.id };
    } catch (error) {
        logger.error(`Errore durante la creazione in ${nomeCollezione}:`, error);
        throw new HttpsError("internal", "Errore interno.");
    }
});

export const aggiornaAnagrafica = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "L'utente non è autenticato.");
    const { nomeCollezione, docId, dati } = request.data;
    if (!nomeCollezione || !docId || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) throw new HttpsError("invalid-argument", "Nome collezione, ID o dati non validi.");
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        await db.collection(nomeCollezione).doc(docId).update({ ...dati, updatedAt: timestamp });
        logger.info(`Utente ${request.auth.uid} ha aggiornato il documento ${docId} in ${nomeCollezione}`);
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
        await db.collection(nomeCollezione).doc(docId).delete();
        logger.info(`Admin ${request.auth.uid} ha eliminato il documento ${docId} da ${nomeCollezione}`);
        return { status: "success" };
    } catch (error) {
        logger.error(`Errore durante l'eliminazione di ${docId} da ${nomeCollezione}:`, error);
        throw new HttpsError("internal", "Errore interno.");
    }
});
