
import { collection, getDocs, query, where, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { db, bulkPutAnagrafiche, bulkPutRapportini } from '@/db/db';

// --- Utility per Timestamp ---
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

// --- Sincronizzazione Anagrafiche ---

const ANAGRAFICHE_TABLES: string[] = [
    'tecnici', 'navi', 'luoghi', 'tipiGiornata', 'clienti',
    'ditte', 'categorie', 'qualifiche', 'veicoli'
];

async function pushDirtyAnagrafiche() {
    console.log("Avvio PUSH Anagrafiche...");
    const now = new Date();
    for (const tableName of ANAGRAFICHE_TABLES) {
        const table = db.table<any, string>(tableName);
        const dirtyRecords = await table.where('isDirty').equals(1).toArray();
        if (dirtyRecords.length === 0) continue;

        console.log(`... Trovati ${dirtyRecords.length} record sporchi in ${tableName}.`);
        const batch = writeBatch(firestore);
        dirtyRecords.forEach(record => {
            const { isDirty, ...firestoreData } = record;
            if (!firestoreData.createdAt) firestoreData.createdAt = now;
            firestoreData.updatedAt = now;
            const docId = tableName === 'tecnici' ? record.uid : record.id;
            batch.set(doc(firestore, tableName, docId), firestoreData, { merge: true });
        });

        await batch.commit();
        await table.bulkPut(dirtyRecords.map(r => ({ ...r, isDirty: 0, updatedAt: now })));
        console.log(`... PUSH completato per ${tableName}.`);
    }
}

export async function syncAnagrafiche() {
    console.log('INIZIO Sincronizzazione Anagrafiche');
    try {
        await pushDirtyAnagrafiche();
        console.log("Avvio PULL Anagrafiche...");
        const lastSync = await getLastSyncTimestamp('anagraficheLastSync');
        const now = new Date();

        if (lastSync) console.log(`... Sincronizzazione incrementale da: ${lastSync.toISOString()}`);
        else console.log('... Prima sincronizzazione. Scarico tutto.');

        for (const name of ANAGRAFICHE_TABLES) {
            let q = query(collection(firestore, name));
            if (lastSync) q = query(q, where("updatedAt", ">", Timestamp.fromDate(lastSync)));
            
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            if (data.length > 0) {
                const processedData = data.map(item => convertFirestoreTimestamps(item));
                await bulkPutAnagrafiche(name, processedData);
                console.log(`... Aggiornati ${data.length} record in ${name}.`);
            } else {
                console.log(`... Nessun dato nuovo per ${name}.`);
            }
        }
        await setLastSyncTimestamp('anagraficheLastSync', now);
        console.log('FINE Sincronizzazione Anagrafiche');
    } catch (error) {
        console.error('ERRORE CRITICO in syncAnagrafiche:', error);
    }
}

// --- Sincronizzazione Rapportini ---

async function pushDirtyRapportini() {
    console.log("Avvio PUSH Rapportini...");
    const now = new Date();
    const dirtyRecords = await db.rapportini.where('isDirty').equals(1).toArray();
    if (dirtyRecords.length === 0) {
        console.log("... Nessun rapportino da inviare.");
        return;
    }

    console.log(`... Trovati ${dirtyRecords.length} rapportini sporchi.`);
    const batch = writeBatch(firestore);
    dirtyRecords.forEach(record => {
        const { isDirty, ...firestoreData } = record;
        if (!firestoreData.createdAt) firestoreData.createdAt = now;
        firestoreData.updatedAt = now;
        batch.set(doc(firestore, 'rapportini', record.id), firestoreData, { merge: true });
    });

    await batch.commit();
    await db.rapportini.bulkPut(dirtyRecords.map(r => ({ ...r, isDirty: 0, updatedAt: now })));
    console.log(`... PUSH di ${dirtyRecords.length} rapportini completato.`);
}

export async function syncRapportini() {
    console.log('INIZIO Sincronizzazione Rapportini');
    try {
        await pushDirtyRapportini();
        console.log("Avvio PULL Rapportini...");
        const lastSync = await getLastSyncTimestamp('rapportiniLastSync');
        const now = new Date();

        if (lastSync) console.log(`... Sincronizzazione incrementale da: ${lastSync.toISOString()}`);
        else console.log('... Prima sincronizzazione. Scarico tutto.');

        let q = query(collection(firestore, 'rapportini'));
        if (lastSync) q = query(q, where("updatedAt", ">", Timestamp.fromDate(lastSync)));
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (data.length > 0) {
            const processedData = data.map(item => convertFirestoreTimestamps(item));
            await bulkPutRapportini(processedData);
            console.log(`... Aggiornati ${data.length} rapportini.`);
        } else {
            console.log("... Nessun rapportino nuovo.");
        }

        await setLastSyncTimestamp('rapportiniLastSync', now);
        console.log('FINE Sincronizzazione Rapportini');
    } catch (error) {
        console.error('ERRORE CRITICO in syncRapportini:', error);
    }
}
