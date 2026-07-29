
import { collection, getDocs, query, where, Timestamp, runTransaction, doc, getDoc } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { db, bulkPutAnagrafiche, bulkPutRapportini } from '@/db/db';

// --- Utility per Timestamp (invariate) ---
const getLastSyncTimestamp = async (key: string): Promise<Date | null> => {
    try {
        const syncStatus = await db.sync_status.get(key);
        return syncStatus ? new Date(syncStatus.value) : null;
    } catch (e) {
        console.error(`Errore nel recuperare l'ultimo timestamp di sincronizzazione per ${key}:`, e);
        return null;
    }
};

const setLastSyncTimestamp = async (key: string, timestamp: Date) => {
    await db.sync_status.put({ id: key, value: timestamp.getTime() });
};

const convertFirestoreTimestamps = (data: any): any => {
    if (data && typeof data.toDate === 'function') {
        return data.toDate();
    }
    if (Array.isArray(data)) {
        return data.map(convertFirestoreTimestamps);
    }
    if (data && typeof data === 'object') {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = convertFirestoreTimestamps(data[key]);
        }
        return res;
    }
    return data;
};

// =======================================================================================
// === LOGICA DI PUSH CON BLOCCO OTTIMISTICO E RESTITUZIONE CONFLITTI ===
// =======================================================================================

/**
 * Funzione generica per PUSH con blocco ottimistico. Restituisce i messaggi di conflitto.
 * @param tableName Il nome della tabella Dexie e della collezione Firestore.
 * @returns Una Promise che risolve con un array di stringhe (messaggi di conflitto).
 */
async function pushDirtyRecords(tableName: string): Promise<string[]> {
    const conflictMessages: string[] = [];
    const table = db.table<any, string>(tableName);
    const dirtyRecords = await table.where('isDirty').equals(1).toArray();

    if (dirtyRecords.length === 0) {
        return [];
    }

    console.log(`[${tableName}] Avvio PUSH con Blocco Ottimistico per ${dirtyRecords.length} record...`);

    for (const record of dirtyRecords) {
        const docId = tableName === 'tecnici' ? record.uid : record.id;
        if (!docId) {
            console.warn(`[${tableName}] Record saltato per ID mancante:`, record);
            continue;
        }
        const docRef = doc(firestore, tableName, docId);

        try {
            await runTransaction(firestore, async (transaction) => {
                const serverDoc = await transaction.get(docRef);
                const localTimestamp = record.updatedAt;

                if (!serverDoc.exists()) {
                    transaction.set(docRef, { ...record, createdAt: new Date(), updatedAt: new Date() });
                } else {
                    const serverData = serverDoc.data();
                    const serverTimestamp = serverData.updatedAt;

                    if (localTimestamp && serverTimestamp && localTimestamp.getTime() < serverTimestamp.toMillis()) {
                        throw new Error(`Conflict detected for doc ${docId} in ${tableName}.`);
                    }
                    transaction.update(docRef, { ...record, updatedAt: new Date() });
                }
            });

            await table.update(record.id, { isDirty: 0 });
            console.log(`[${tableName}] Record ${docId} sincronizzato con successo.`);

        } catch (error: any) {
            if (error.message.startsWith('Conflict detected')) {
                const recordName = record.nome || record.id;
                const message = `Conflitto per '${recordName}'. La modifica è stata scartata perché obsoleta. Dati aggiornati.`;
                conflictMessages.push(message);

                const serverDoc = await getDoc(docRef);
                if (serverDoc.exists()) {
                    const freshData = convertFirestoreTimestamps({ id: serverDoc.id, ...serverDoc.data() });
                    await table.put({ ...freshData, isDirty: 0 });
                }
            } else {
                console.error(`[${tableName}] Errore transazione per record ${docId}:`, error);
                const recordName = record.nome || record.id;
                conflictMessages.push(`Errore di sincronizzazione per '${recordName}'. Contattare supporto.`);
            }
        }
    }
    return conflictMessages;
}

const ANAGRAFICHE_TABLES: string[] = [
    'tecnici', 'navi', 'luoghi', 'tipiGiornata', 'clienti',
    'ditte', 'categorie', 'qualifiche', 'veicoli'
];

async function pushDirtyAnagrafiche(): Promise<string[]> {
    let allConflicts: string[] = [];
    for (const tableName of ANAGRAFICHE_TABLES) {
        const conflicts = await pushDirtyRecords(tableName);
        allConflicts = [...allConflicts, ...conflicts];
    }
    return allConflicts;
}

async function pushDirtyRapportini(): Promise<string[]> {
    return await pushDirtyRecords('rapportini');
}

// --- Logica di PULL (Modificata per restituire i conflitti) ---

export async function syncAnagrafiche(): Promise<string[]> {
    console.log('INIZIO Sincronizzazione Anagrafiche');
    try {
        const conflicts = await pushDirtyAnagrafiche();
        console.log("Avvio PULL Anagrafiche...");
        const lastSync = await getLastSyncTimestamp('anagraficheLastSync');
        const now = new Date();

        for (const name of ANAGRAFICHE_TABLES) {
            let q = query(collection(firestore, name));
            if (lastSync) q = query(q, where("updatedAt", ">", Timestamp.fromDate(lastSync)));
            
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            if (data.length > 0) {
                const processedData = data.map(item => convertFirestoreTimestamps(item));
                await bulkPutAnagrafiche(name, processedData);
            }
        }
        await setLastSyncTimestamp('anagraficheLastSync', now);
        console.log('FINE Sincronizzazione Anagrafiche');
        return conflicts;
    } catch (error) {
        console.error('ERRORE CRITICO in syncAnagrafiche:', error);
        return ['Errore grave durante la sincronizzazione delle anagrafiche. Contattare il supporto.'];
    }
}

export async function syncRapportini(): Promise<string[]> {
    console.log('INIZIO Sincronizzazione Rapportini');
    try {
        const conflicts = await pushDirtyRapportini();
        console.log("Avvio PULL Rapportini...");
        const lastSync = await getLastSyncTimestamp('rapportiniLastSync');
        const now = new Date();

        let q = query(collection(firestore, 'rapportini'));
        if (lastSync) q = query(q, where("updatedAt", ">", Timestamp.fromDate(lastSync)));
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (data.length > 0) {
            const processedData = data.map(item => convertFirestoreTimestamps(item));
            await bulkPutRapportini(processedData);
        }

        await setLastSyncTimestamp('rapportiniLastSync', now);
        console.log('FINE Sincronizzazione Rapportini');
        return conflicts;
    } catch (error) {
        console.error('ERRORE CRITICO in syncRapportini:', error);
        return ['Errore grave durante la sincronizzazione dei rapportini. Contattare il supporto.'];
    }
}
