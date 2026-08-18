
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const db = admin.firestore();
const REGION = "us-central1";

// Funzione di utility per verificare i permessi
const verifyAuth = async (req: any, res: any): Promise<admin.auth.DecodedIdToken | null> => {
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

// ============================================================================
// FUNZIONE DI CREAZIONE - Logica di scrittura diretta e sicura con Timestamp
// ============================================================================
export const createRapportino = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const decodedToken = await verifyAuth(req, res);
    if (!decodedToken) return;

    const data = req.body.data || req.body;

    const dataWithTimestamps = {
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
    };

    try {
        const docRef = await db.collection('rapportini').add(dataWithTimestamps);
        logger.info(`Rapportino creato con ID: ${docRef.id} da UID: ${decodedToken.uid}`);
        res.status(201).json({ status: 'success', id: docRef.id });
    } catch (error) {
        logger.error("Errore durante la creazione del rapportino:", error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante la creazione del rapportino.' });
    }
});

// ============================================================================
// FUNZIONE DI AGGIORNAMENTO - Logica di scrittura diretta e sicura con Timestamp
// ============================================================================
export const updateRapportino = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const decodedToken = await verifyAuth(req, res);
    if (!decodedToken) return;

    const { id, data } = req.body;
    if (!id || !data) {
        res.status(400).json({ status: 'error', message: 'ID o dati del rapportino mancanti.' });
        return;
    }

    const dataWithTimestamp = {
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decodedToken.uid,
    };

    try {
        const docRef = db.collection('rapportini').doc(id);
        await docRef.update(dataWithTimestamp);
        logger.info(`Rapportino ${id} aggiornato con successo da UID: ${decodedToken.uid}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        logger.error(`Errore durante l'aggiornamento del rapportino ${id}:`, error);
        res.status(500).json({ status: 'error', message: `Errore interno durante l'aggiornamento del rapportino ${id}.` });
    }
});

// ============================================================================
// FUNZIONE DI CANCELLAZIONE - Verifiche di sicurezza migliorate
// ============================================================================
export const deleteRapportino = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const decodedToken = await verifyAuth(req, res);
    if (!decodedToken) return;

    const { id } = req.body;
    if (!id) {
        res.status(400).json({ status: 'error', message: 'ID del rapportino mancante.' });
        return;
    }

    if (decodedToken.admin !== true) {
        logger.warn(`Utente non autorizzato (UID: ${decodedToken.uid}) ha tentato di eliminare il rapportino ${id}.`);
        res.status(403).json({ status: 'error', message: "Azione non autorizzata. Solo gli amministratori possono eliminare." });
        return;
    }

    try {
        const docRef = db.collection('rapportini').doc(id);
        await docRef.delete();
        
        logger.info(`Rapportino ${id} eliminato con successo dall'admin (UID: ${decodedToken.uid}).`);
        res.status(200).json({ status: 'success', message: `Rapportino ${id} eliminato.` });

    } catch (error) {
        logger.error(`Errore CANCELLAZIONE rapportino ${id}:`, error);
        res.status(500).json({ status: 'error', message: 'Errore interno del server.' });
    }
});

// ===============================================================================
// FUNZIONE PER LA SINCRONIZZAZIONE - Restituisce tutti i rapportini per il client
// ===============================================================================
export const getAllRapportiniForSync = onRequest({ region: REGION, cors: true }, async (req, res) => {
    if (req.method !== 'POST') { // Le callable function sono sempre POST
        res.status(405).send('Method Not Allowed');
        return;
    }

    const decodedToken = await verifyAuth(req, res);
    if (!decodedToken) return; // Errore già gestito

    try {
        const snapshot = await db.collection('rapportini').get();
        const rapportini = snapshot.docs.map(doc => {
            const data = doc.data();
            // Converti i timestamp di Firestore in un formato serializzabile (millisecondi)
            return {
                ...data,
                id: doc.id,
                data: data.data.toDate(), // Assicurati che il campo data sia un oggetto Date
                createdAt: data.createdAt?.toMillis(),
                updatedAt: data.updatedAt?.toMillis(),
            };
        });

        res.status(200).json({ data: rapportini });

    } catch (error) {
        logger.error("Errore durante il recupero dei rapportini per la sincronizzazione:", error);
        res.status(500).json({ status: 'error', message: 'Errore interno durante il recupero dei dati.' });
    }
});
