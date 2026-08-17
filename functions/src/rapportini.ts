import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const db = admin.firestore();
const REGION = 'us-central1';

// Funzione helper per l'autenticazione potenziata: restituisce l'intero token decodificato
const authenticate = async (req: any, res: any): Promise<admin.auth.DecodedIdToken | null> => {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        logger.error("Token non fornito o malformato.");
        res.status(401).json({ error: "Token non fornito." });
        return null;
    }
    const idToken = authorization.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error: any) {
        logger.error("Errore di verifica del token:", error);
        if (error.code === 'auth/id-token-expired') {
            res.status(401).json({ error: "Token scaduto." });
        } else {
            res.status(401).json({ error: "Token non valido." });
        }
        return null;
    }
};

// 1. CREAZIONE (Logica Corretta)
export const createRapportino = onRequest({ cors: true, region: REGION }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const decodedToken = await authenticate(req, res);
    if (!decodedToken) return;

    const rapportinoData = req.body;
    if (!rapportinoData || !rapportinoData.tecnicoId) {
        res.status(400).json({ error: "Payload invalido, tecnicoId mancante." });
        return;
    }

    // REGOLA DI SICUREZZA: Permetti se l'utente è admin O se sta creando per se stesso.
    if (decodedToken.ruolo !== 'admin' && rapportinoData.tecnicoId !== decodedToken.uid) {
        res.status(403).json({ error: "Non autorizzato a creare rapportini per altri tecnici." });
        return;
    }

    try {
        const dataToSave: any = {
            ...rapportinoData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: decodedToken.uid,
            updatedBy: decodedToken.uid,
        };
        if (rapportinoData.data) {
             dataToSave.data = admin.firestore.Timestamp.fromDate(new Date(rapportinoData.data));
        }
        delete dataToSave.id;

        const newDocRef = await db.collection('rapportini').add(dataToSave);
        logger.info(`Rapportino ${newDocRef.id} creato da UID ${decodedToken.uid}`);
        res.status(201).json({ id: newDocRef.id });
    } catch (error) {
        logger.error("Errore creazione rapportino:", error);
        res.status(500).json({ error: "Errore interno del server." });
    }
});

// 2. MODIFICA (Logica Corretta)
export const updateRapportino = onRequest({ cors: true, region: REGION }, async (req, res) => {
    if (req.method !== 'PUT') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const decodedToken = await authenticate(req, res);
    if (!decodedToken) return;

    const { id, ...dataFromClient } = req.body;
    if (!id) {
        res.status(400).json({ error: "ID del rapportino mancante." });
        return;
    }

    try {
        const docRef = db.collection('rapportini').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
             res.status(404).json({ error: "Rapportino non trovato." });
             return;
        }

        const existingData = doc.data() as admin.firestore.DocumentData;

        // REGOLA DI SICUREZZA (Corretta): Permetti se l'utente è admin O il tecnico principale.
        const isOwner = existingData.tecnicoId === decodedToken.uid;
        const isAdmin = decodedToken.ruolo === 'admin';

        if (!isOwner && !isAdmin) {
             res.status(403).json({ error: "Non autorizzato a modificare questo rapportino." });
             return;
        }

        const dataToUpdate: any = {
            ...existingData,
            ...dataFromClient,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: decodedToken.uid,
        };

        if (dataFromClient.data) {
            dataToUpdate.data = admin.firestore.Timestamp.fromDate(new Date(dataFromClient.data));
        }

        await docRef.update(dataToUpdate);

        logger.info(`Rapportino ${id} aggiornato da UID ${decodedToken.uid} (Admin: ${isAdmin})`);
        res.status(200).json({ success: true, id: id });
    } catch (error) {
        logger.error(`Errore aggiornamento rapportino ${id}:`, error);
        res.status(500).json({ error: "Errore interno del server." });
    }
});

// 3. CANCELLAZIONE (Logica Corretta)
export const deleteRapportino = onRequest({ cors: true, region: REGION }, async (req, res) => {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const decodedToken = await authenticate(req, res);
    if (!decodedToken) return;

    const { id } = req.body;
    if (!id) {
        res.status(400).json({ error: "ID del rapportino mancante." });
        return;
    }

    try {
        const docRef = db.collection('rapportini').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            res.status(404).json({ error: "Rapportino non trovato." });
            return;
        }

        // REGOLA DI SICUREZZA (Corretta): Permetti SOLO se l'utente è admin.
        const isAdmin = decodedToken.ruolo === 'admin';

        if (!isAdmin) {
             res.status(403).json({ error: "Non autorizzato a eliminare questo rapportino. L'operazione è consentita solo agli amministratori." });
             return;
        }

        await docRef.update({
            isDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: decodedToken.uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: decodedToken.uid,
        });
        logger.info(`Rapportino ${id} eliminato (soft delete) da UID ${decodedToken.uid} (Admin: ${isAdmin})`);
        res.status(200).json({ success: true, id: id });
    } catch (error) {
        logger.error(`Errore eliminazione rapportino ${id}:`, error);
        res.status(500).json({ error: "Errore interno del server." });
    }
});
