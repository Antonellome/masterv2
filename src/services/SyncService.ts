
import { collection, getDocs, query, where, Timestamp, runTransaction, doc, getDoc } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { db, bulkPutGeneric } from '@/db/db';
import { anagraficheConfig } from '@/config/anagrafiche.config';

// Chiave di sincronizzazione, la versione non è più rilevante grazie alla nuova logica, ma la manteniamo per coerenza.
const ANAGRAFICHE_SYNC_KEY = 'anagraficheLastSync_v5';

// --- Funzione di recupero timestamp con CONTROLLO ANTI-FUTURO ---
const getLastSyncTimestamp = async (key: string): Promise<Date | null> => {
    try {
        const syncStatus = await db.sync_status.get(key);
        if (!syncStatus) return null;

        const lastSyncDate = new Date(syncStatus.value);
        const now = new Date();

        // SE LA DATA SALVATA È NEL FUTURO, IGNORALA!
        if (lastSyncDate > now) {
            console.warn(`[SyncService] Trovata data di sincronizzazione futura per la chiave '${key}': ${lastSyncDate.toISOString()}. La ignoro per forzare un full-sync correttivo.`);
            return null; // Restituendo null, si forza una sincronizzazione completa.
        }

        return lastSyncDate;
    } catch (e) {
        console.error(`Errore nel recuperare l'ultimo timestamp di sincronizzazione per ${key}:`, e);
        return null;
    }
};

const setLastSyncTimestamp = async (key: string, timestamp: Date) => {
    await db.sync_status.put({ id: key, value: timestamp.getTime() });
};

const convertFirestoreTimestamps = (data: any): any => {
    if (data && typeof data.toDate === 'function') return data.toDate();
    if (Array.isArray(data)) return data.map(convertFirestoreTimestamps);
    if (data && typeof data === 'object') {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = convertFirestoreTimestamps(data[key]);
        }
        return res;
    }
    return data;
};

async function pushDirtyRecords(tableName: string): Promise<string[]> {
    const conflictMessages: string[] = [];
    const table = db.table<any, string>(tableName);
    const dirtyRecords = await table.where('isDirty').equals(1).toArray();

    if (dirtyRecords.length === 0) return [];

    for (const record of dirtyRecords) {
        const docId = tableName === 'tecnici' ? record.uid : record.id;
        if (!docId) continue;
        const docRef = doc(firestore, tableName, docId);

        try {
            await runTransaction(firestore, async (transaction) => {
                const serverDoc = await transaction.get(docRef);
                if (!serverDoc.exists()) {
                    transaction.set(docRef, { ...record, createdAt: new Date(), updatedAt: new Date() });
                } else {
                    const serverData = serverDoc.data();
                    const serverTimestamp = serverData.updatedAt;
                    if (record.updatedAt && serverTimestamp && record.updatedAt.getTime() < serverTimestamp.toMillis()) {
                        throw new Error(`Conflict detected for doc ${docId} in ${tableName}.`);
                    }
                    transaction.update(docRef, { ...record, updatedAt: new Date() });
                }
            });
            await table.update(record.id, { isDirty: 0 });
        } catch (error: any) {
            const recordName = record.nome || record.id;
            if (error.message.startsWith('Conflict detected')) {
                const message = `Conflitto per '${recordName}'. La modifica è stata scartata perché obsoleta.`;
                conflictMessages.push(message);
                const serverDoc = await getDoc(docRef);
                if (serverDoc.exists()) {
                    const freshData = convertFirestoreTimestamps({ id: serverDoc.id, ...serverDoc.data() });
                    await table.put({ ...freshData, isDirty: 0 });
                }
            } else {
                conflictMessages.push(`Errore di sincronizzazione per '${recordName}'.`);
            }
        }
    }
    return conflictMessages;
}

const ANAGRAFICHE_TABLES: string[] = Object.values(anagraficheConfig).map(config => config.collectionName);
if (!ANAGRAFICHE_TABLES.includes('tecnici')) {
    ANAGRAFICHE_TABLES.push('tecnici');
}

async function pushDirtyAnagrafiche(): Promise<string[]> {
    let allConflicts: string[] = [];
    for (const tableName of ANAGRAFICHE_TABLES) {
        allConflicts.push(...await pushDirtyRecords(tableName));
    }
    return allConflicts;
}

export async function syncAnagrafiche(): Promise<string[]> {
    console.log(`INIZIO Sincronizzazione Anagrafiche (Logica Intelligente AUTO-CORRETTIVA) con chiave: ${ANAGRAFICHE_SYNC_KEY}`);
    try {
        const conflicts = await pushDirtyAnagrafiche();
        
        console.log("Avvio PULL Anagrafiche...");
        const lastSync = await getLastSyncTimestamp(ANAGRAFICHE_SYNC_KEY);
        const now = new Date();

        for (const collectionName of ANAGRAFICHE_TABLES) {
            const config = Object.values(anagraficheConfig).find(c => c.collectionName === collectionName);
            const timestampField = config?.timestampField !== undefined ? config.timestampField : 'updatedAt';

            let q = query(collection(firestore, collectionName));

            if (lastSync && timestampField) {
                console.log(`[SyncService] ${collectionName}: applico filtro > ${lastSync.toISOString()} su campo '${timestampField}'`);
                q = query(q, where(timestampField, ">", Timestamp.fromDate(lastSync)));
            } else {
                console.log(`[SyncService] ${collectionName}: eseguo sincronizzazione completa (nessun filtro temporale).`);
            }
            
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            if (data.length > 0) {
                console.log(`[SyncService] Trovati ${data.length} nuovi record per la collezione: ${collectionName}`);
                const processedData = data.map(item => convertFirestoreTimestamps(item));
                await bulkPutGeneric(collectionName, processedData);
            }
        }
        
        await setLastSyncTimestamp(ANAGRAFICHE_SYNC_KEY, now);
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
        const conflicts = await pushDirtyRecords('rapportini');
        const lastSync = await getLastSyncTimestamp('rapportiniLastSync');
        const now = new Date();

        let q = query(collection(firestore, 'rapportini'));
        if (lastSync) {
            q = query(q, where("updatedAt", ">", Timestamp.fromDate(lastSync)));
        }
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (data.length > 0) {
            const processedData = data.map(item => convertFirestoreTimestamps(item));
            await bulkPutGeneric('rapportini', processedData);
        }

        await setLastSyncTimestamp('rapportiniLastSync', now);
        return conflicts;
    } catch (error) {
        console.error('ERRORE CRITICO in syncRapportini:', error);
        return ['Errore grave durante la sincronizzazione dei rapportini. Contattare il supporto.'];
    }
}
