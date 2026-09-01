
# Codice Sorgente COMPLETO e DEFINITIVO per TUTTE le Cloud Functions

**Azione richiesta:** Sostituire l'intero contenuto della directory `functions/src/` con i file e il codice seguenti. Questo set di funzioni è completo e corregge tutti i bug di cui abbiamo discusso.

---

## File 1: `functions/src/anagrafiche.ts`

Questo file gestisce la sincronizzazione di tutti i dati anagrafici.

```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const REGION = "europe-west1";

// Funzione Helper per processare una singola collezione
const syncCollection = async (collectionName: string, lastSync: number | null) => {
    let query = admin.firestore().collection(collectionName);
    // Usiamo 'updatedAt' come campo standard per il timestamp di aggiornamento.
    // Se non esiste, la query non filtrerà, scaricando tutto (comportamento corretto per le anagrafiche senza timestamp).
    if (lastSync && lastSync > 0) {
        query = query.where('updatedAt', '>', new Date(lastSync));
    }
    const snapshot = await query.get();
    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => {
        const docData = doc.data();
        const serializedData: { [key: string]: any } = { id: doc.id };
        // Serializza tutti i campi Timestamp in stringhe ISO per il client
        for (const key in docData) {
            if (docData[key] instanceof admin.firestore.Timestamp) {
                serializedData[key] = docData[key].toDate().toISOString();
            } else {
                serializedData[key] = docData[key];
            }
        }
        return serializedData;
    });
};

export const syncAllAnagrafiche = onCall({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Auth mancante.");
    }
    const { localTimestamps } = request.data;

    // Converte i timestamp ricevuti dal client (numeri) in un formato utilizzabile
    const lastSyncs = {
        tecnici: localTimestamps?.tecnici || 0,
        clienti: localTimestamps?.clienti || 0,
        navi: localTimestamps?.navi || 0,
        luoghi: localTimestamps?.luoghi || 0,
        ditte: localTimestamps?.ditte || 0,
        settings: localTimestamps?.settings || 0,
    };

    try {
        const [tecnici, clienti, navi, luoghi, ditte, settings] = await Promise.all([
            syncCollection('tecnici', lastSyncs.tecnici),
            syncCollection('clienti', lastSyncs.clienti),
            syncCollection('navi', lastSyncs.navi),
            syncCollection('luoghi', lastSyncs.luoghi),
            syncCollection('ditte', lastSyncs.ditte),
            syncCollection('settings', lastSyncs.settings),
        ]);

        // Restituisce un oggetto strutturato per evitare l'errore 'storeNames parameter was empty'
        return {
            tecnici,
            clienti,
            navi,
            luoghi,
            ditte,
            settings,
        };
    } catch (error) {
        console.error("Errore grave durante syncAllAnagrafiche:", error);
        throw new HttpsError("internal", "Errore interno durante la sincronizzazione delle anagrafiche.");
    }
});
```

---

## File 2: `functions/src/checkin.ts`

Questo file gestisce la creazione e la sincronizzazione dei check-in.

```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const REGION = "europe-west1";

export const createCheckin = onCall({ region: REGION }, async (request) => {
    if (!request.auth) { 
        throw new HttpsError("unauthenticated", "Auth mancante."); 
    }
    const { tecnicoId, ...checkinData } = request.data;
    if (request.auth.uid !== tecnicoId) {
        throw new HttpsError("permission-denied", "Non puoi creare un checkin per un altro utente.");
    }
    const docData = {
        ...checkinData,
        tecnicoId: tecnicoId,
        // Converte la stringa ISO ricevuta dal client in un oggetto Data di Firestore
        timestampImpostato: new Date(checkinData.timestampImpostato),
    };

    try {
        const docRef = await admin.firestore().collection("checkin_giornalieri").add(docData);
        const newDoc = await docRef.get();
        const newDocData = newDoc.data();
        if (!newDocData) {
            throw new HttpsError("internal", "Impossibile recuperare il check-in dopo il salvataggio.");
        }
        return { 
            data: { 
                id: newDoc.id, 
                ...newDocData,
                timestampImpostato: newDocData.timestampImpostato.toDate().toISOString(),
                ...(newDocData.timestampReale && { timestampReale: newDocData.timestampReale.toDate().toISOString() })
            } 
        };
    } catch (error) {
        console.error("Errore grave durante createCheckin:", error);
        throw new HttpsError("internal", "Errore interno durante la creazione del check-in.");
    }
});

export const getAllCheckinsForSync = onCall({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Auth mancante.");
    }
    const { tecnicoId, lastSyncTimestamp } = request.data;
    if (request.auth.uid !== tecnicoId) {
        throw new HttpsError("permission-denied", "Non puoi richiedere i checkin per un altro utente.");
    }
    
    try {
        let query = admin.firestore().collection('checkin_giornalieri').where('tecnicoId', '==', tecnicoId);
        if (lastSyncTimestamp && lastSyncTimestamp > 0) {
            query = query.where('timestampImpostato', '>', new Date(lastSyncTimestamp));
        } else {
            const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
            query = query.where('timestampImpostato', '>=', fortyEightHoursAgo);
        }
        query = query.orderBy('timestampImpostato', 'desc');
        const snapshot = await query.get();
        if (snapshot.empty) {
            return { data: [] };
        }
        const results = snapshot.docs.map(doc => {
            const docData = doc.data();
            return { 
                id: doc.id, 
                ...docData,
                timestampImpostato: docData.timestampImpostato.toDate().toISOString(),
                ...(docData.timestampReale && { timestampReale: docData.timestampReale.toDate().toISOString() })
            };
        });
        return { data: results };
    } catch (error) {
        console.error("Errore grave durante getAllCheckinsForSync:", error);
        throw new HttpsError("internal", "Errore interno durante il sync dei check-in.");
    }
});
```

---

## File 3: `functions/src/rapportini.ts`

Questo file contiene TUTTE le funzioni per i rapportini: sync, salvataggio, CANCELLAZIONE e upload file.

```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const REGION = "europe-west1";

// Funzione per il download dei rapportini
export const getAllRapportiniForSync = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth mancante.");
    const { tecnicoId, lastSyncTimestamp } = request.data;
    if (request.auth.uid !== tecnicoId) throw new HttpsError("permission-denied", "Accesso negato.");

    try {
        let query = admin.firestore().collection('rapportini').where('tecnicoId', '==', tecnicoId);
        const timestampField = 'data_creazione_locale';
        if (lastSyncTimestamp && lastSyncTimestamp > 0) {
            query = query.where(timestampField, '>', new Date(lastSyncTimestamp));
        } else {
            const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
            query = query.where(timestampField, '>=', seventyTwoHoursAgo);
        }
        query = query.orderBy(timestampField, 'desc');
        const snapshot = await query.get();
        if (snapshot.empty) return { data: [] };

        const results = snapshot.docs.map(doc => {
            const docData = doc.data();
            const serializedData: { [key: string]: any } = { id: doc.id };
            for (const key in docData) {
                if (docData[key] instanceof admin.firestore.Timestamp) {
                    serializedData[key] = docData[key].toDate().toISOString();
                } else {
                    serializedData[key] = docData[key];
                }
            }
            return serializedData;
        });
        return { data: results };
    } catch (error) {
        console.error("Errore grave durante getAllRapportiniForSync:", error);
        throw new HttpsError("internal", "Errore interno durante il sync dei rapportini.");
    }
});

// Funzione per il salvataggio (creazione/aggiornamento) di un rapportino
export const saveRapportino = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth mancante.");
    const { id, ...rapportinoData } = request.data;
    if (request.auth.uid !== rapportinoData.tecnicoId) throw new HttpsError("permission-denied", "Accesso negato.");

    const collectionRef = admin.firestore().collection('rapportini');
    
    // Converte tutte le date da stringa a oggetto Data per Firestore
    const dataToSave = { ...rapportinoData };
    for (const key in dataToSave) {
        // Identifica campi che sono stringhe ISO e li converte
        if (typeof dataToSave[key] === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dataToSave[key])) {
            dataToSave[key] = new Date(dataToSave[key]);
        }
    }
    dataToSave.updatedAt = new Date(); // Aggiunge/aggiorna il timestamp di modifica

    try {
        let docRef;
        if (id) {
            // Aggiorna un rapportino esistente
            docRef = collectionRef.doc(id);
            await docRef.set(dataToSave, { merge: true });
        } else {
            // Crea un nuovo rapportino
            docRef = await collectionRef.add(dataToSave);
        }
        
        const newDoc = await docRef.get();
        const newDocData = newDoc.data();
        if (!newDocData) throw new HttpsError("internal", "Impossibile recuperare il rapportino dopo il salvataggio.");

        // Serializza la risposta per il client
        const serializedData: { [key: string]: any } = { id: newDoc.id };
        for (const key in newDocData) {
            if (newDocData[key] instanceof admin.firestore.Timestamp) {
                serializedData[key] = newDocData[key].toDate().toISOString();
            } else {
                serializedData[key] = newDocData[key];
            }
        }
        return { data: serializedData };
    } catch (error) {
        console.error("Errore grave durante saveRapportino:", error);
        throw new HttpsError("internal", "Errore interno durante il salvataggio del rapportino.");
    }
});

// *** INIZIO NUOVA FUNZIONE ***
// Funzione per la CANCELLAZIONE di un rapportino
export const deleteRapportino = onCall({ region: REGION }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const { rapportinoId } = request.data;
    const { uid } = request.auth;

    if (!rapportinoId || typeof rapportinoId !== "string") {
        throw new HttpsError("invalid-argument", "L'ID del rapportino è obbligatorio.");
    }

    const rapportinoRef = admin.firestore().collection("rapportini").doc(rapportinoId);

    try {
        const doc = await rapportinoRef.get();

        if (!doc.exists) {
            console.warn(`Tentativo di cancellare un rapportino inesistente: ${rapportinoId}`);
            return { data: { success: true, message: "Rapportino già cancellato." } };
        }

        const rapportinoData = doc.data();

        if (rapportinoData?.tecnicoId !== uid) {
            throw new HttpsError("permission-denied", "Non hai i permessi per cancellare questo rapportino.");
        }

        await rapportinoRef.delete();
        console.log(`Rapportino ${rapportinoId} cancellato con successo dall'utente ${uid}.`);

        return { data: { success: true, message: "Rapportino cancellato con successo." } };

    } catch (error) {
        console.error(`Errore grave durante deleteRapportino (ID: ${rapportinoId}):`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Errore interno durante la cancellazione del rapportino.");
    }
});
// *** FINE NUOVA FUNZIONE ***

// Funzione per generare un URL sicuro per l'upload di file su Cloud Storage
export const generateSignedUploadUrl = onCall({ region: REGION }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth mancante.");
    const { fileName, contentType, rapportinoId } = request.data;
    const tecnicoId = request.auth.uid;

    const bucket = admin.storage().bucket();
    const filePath = `uploads/${tecnicoId}/${rapportinoId}/${Date.now()}-${fileName}`;
    const file = bucket.file(filePath);

    const options = {
        version: 'v4' as 'v4',
        action: 'write' as 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minuti di validità
        contentType: contentType,
    };

    try {
        const [url] = await file.getSignedUrl(options);
        return { data: { url, filePath } };
    } catch (error) {
        console.error("Errore grave durante generateSignedUploadUrl:", error);
        throw new HttpsError("internal", "Impossibile generare l'URL per l'upload.");
    }
});
```
