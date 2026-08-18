
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

// Inizializzazione di Firestore
const db = admin.firestore();
const REGION = "us-central1";

// --- FUNZIONI DI UTILITA' E SICUREZZA ---

/**
 * Verifica il token di autorizzazione Firebase nell'header della richiesta.
 * @param req La richiesta in ingresso.
 * @param res La risposta da inviare in caso di errore.
 * @returns Il token decodificato se valido, altrimenti null.
 */
const verificaAutenticazione = async (req: any, res: any): Promise<admin.auth.DecodedIdToken | null> => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
        res.status(401).json({ status: 'error', message: 'Token di autorizzazione mancante.' });
        return null;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error: any) {
        logger.error(`Errore di autenticazione:`, error);
        res.status(401).json({ status: 'error', message: 'Token non valido o scaduto.' });
        return null;
    }
};

// Lista bianca delle collezioni di anagrafica consentite per le operazioni CRUD.
const COLLEZIONI_ANAGRAFICA = [
    'clienti',
    'navi',
    'luoghi',
    'ditte',
    'categorie',
    'veicoli',
    'tipiGiornata'
];

/**
 * Serializza un documento Firestore, convertendo i Timestamp in millisecondi.
 * @param doc Il documento snapshot di Firestore.
 * @returns Un oggetto serializzato o null.
 */
const serializzaDocumento = (doc: admin.firestore.DocumentSnapshot) => {
    const data = doc.data();
    if (!data) return null;
    
    const serializedData: { [key: string]: any } = { id: doc.id };
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            serializedData[key] = (value instanceof admin.firestore.Timestamp) ? value.toMillis() : value;
        }
    }
    return serializedData;
};


// --- API CLOUD FUNCTIONS PER LE ANAGRAFICHE ---

// 1. CREAZIONE (CREATE)
export const creaAnagrafica = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Metodo non consentito');
        return;
    }
    const decodedToken = await verificaAutenticazione(req, res);
    if (!decodedToken) return;

    const { nomeCollezione, dati } = req.body;
    if (!nomeCollezione || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) {
        res.status(400).json({ status: 'error', message: 'Nome collezione non valido o dati mancanti.' });
        return;
    }

    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const docRef = await db.collection(nomeCollezione).add({ ...dati, createdAt: timestamp, updatedAt: timestamp });
        logger.info(`Utente ${decodedToken.uid} ha creato un documento in ${nomeCollezione} con ID: ${docRef.id}`);
        res.status(201).json({ data: { id: docRef.id } });
    } catch (error) {
        logger.error(`Errore durante la creazione in ${nomeCollezione}:`, error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante la creazione del documento.' });
    }
});

// 2. LETTURA (READ - per la sincronizzazione iniziale)
export const syncAllAnagrafiche = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Metodo non consentito');
        return;
    }
    const decodedToken = await verificaAutenticazione(req, res);
    if (!decodedToken) return; 

    try {
        logger.info(`Richiesta di sincronizzazione ANAGRAFICHE AGGREGATE per l'utente: ${decodedToken.uid}`);
        const promises = COLLEZIONI_ANAGRAFICA.map(nomeCollezione => db.collection(nomeCollezione).get());
        const snapshots = await Promise.all(promises);

        const tutteLeAnagrafiche: { [key: string]: any[] } = {};
        snapshots.forEach((snapshot, index) => {
            const nomeCollezione = COLLEZIONI_ANAGRAFICA[index];
            tutteLeAnagrafiche[nomeCollezione] = snapshot.docs.map(serializzaDocumento).filter(doc => doc !== null);
        });

        logger.info(`Sincronizzazione aggregata completata. Inviate ${COLLEZIONI_ANAGRAFICA.length} collezioni.`);
        res.status(200).json({ data: tutteLeAnagrafiche });
    } catch (error) {
        logger.error("Errore durante il recupero aggregato delle anagrafiche:", error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante il recupero dei dati.' });
    }
});

// 3. AGGIORNAMENTO (UPDATE)
export const aggiornaAnagrafica = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Metodo non consentito');
        return;
    }
    const decodedToken = await verificaAutenticazione(req, res);
    if (!decodedToken) return;

    const { nomeCollezione, docId, dati } = req.body;
    if (!nomeCollezione || !docId || !dati || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) {
        res.status(400).json({ status: 'error', message: 'Nome collezione, ID documento o dati non validi.' });
        return;
    }

    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        await db.collection(nomeCollezione).doc(docId).update({ ...dati, updatedAt: timestamp });
        logger.info(`Utente ${decodedToken.uid} ha aggiornato il documento ${docId} in ${nomeCollezione}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        logger.error(`Errore durante l'aggiornamento di ${docId} in ${nomeCollezione}:`, error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante l\'aggiornamento del documento.' });
    }
});

// 4. CANCELLAZIONE (DELETE)
export const eliminaAnagrafica = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Metodo non consentito');
        return;
    }
    const decodedToken = await verificaAutenticazione(req, res);
    if (!decodedToken) return;

    const { nomeCollezione, docId } = req.body;
    if (!nomeCollezione || !docId || !COLLEZIONI_ANAGRAFICA.includes(nomeCollezione)) {
        res.status(400).json({ status: 'error', message: 'Nome collezione o ID documento non validi.' });
        return;
    }

    try {
        await db.collection(nomeCollezione).doc(docId).delete();
        logger.info(`Utente ${decodedToken.uid} ha eliminato il documento ${docId} da ${nomeCollezione}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        logger.error(`Errore durante l'eliminazione di ${docId} da ${nomeCollezione}:`, error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante l\'eliminazione del documento.' });
    }
});
