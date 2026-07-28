import { collection, getDocs, query, where, Timestamp, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { db, bulkPutAnagrafiche } from '@/db/db';
import type { Rapportino, Tecnico } from '@/models/definitions';

const ANAGRAFICHE_TABLES: (keyof typeof db)[] = [
    'tecnici', 
    'navi', 
    'luoghi', 
    'tipiGiornata', 
    'clienti', 
    'ditte', 
    'categorie', 
    'qualifiche', 
    'veicoli'
];

const getLastSyncTimestamp = async (): Promise<Date | null> => {
    try {
        const lastSync = await db.sync_status.get('lastSyncTimestamp');
        return lastSync ? new Date(lastSync.value) : null;
    } catch (e) {
        console.error("Errore nel recuperare l'ultimo timestamp di sincronizzazione:", e);
        return null;
    }
};

const setLastSyncTimestamp = async (timestamp: Date) => {
    await db.sync_status.put({ id: 'lastSyncTimestamp', value: timestamp.getTime() });
};

async function pushDirtyData() {
    console.log("Avvio del processo di PUSH dei dati 'sporchi'...");
    const now = new Date();

    for (const tableName of ANAGRAFICHE_TABLES) {
        const table = db.table<any, string>(tableName);
        const dirtyRecords = await table.where('isDirty').equals(1).toArray();

        if (dirtyRecords.length === 0) {
            continue;
        }

        console.log(`... Trovati ${dirtyRecords.length} record 'sporchi' in ${tableName}. Invio in corso...`);
        
        const batch = writeBatch(firestore);
        const recordsToClean: any[] = [];

        for (const record of dirtyRecords) {
            const { isDirty, ...firestoreData } = record;
            
            if (!firestoreData.createdAt) {
                firestoreData.createdAt = now;
            }
            firestoreData.updatedAt = now;

            const docId = tableName === 'tecnici' ? record.uid : record.id;
            const docRef = doc(firestore, tableName, docId);

            batch.set(docRef, firestoreData, { merge: true });
            recordsToClean.push(record);
        }

        try {
            await batch.commit();
            console.log(`... ${dirtyRecords.length} record di ${tableName} inviati con successo a Firestore.`);

            const cleanRecords = recordsToClean.map(record => ({
                ...record,
                isDirty: 0,
                updatedAt: now,
            }));

            await table.bulkPut(cleanRecords);
            console.log(`... ${cleanRecords.length} record locali di ${tableName} sono stati 'ripuliti'.`);

        } catch (error) {
            console.error(`ERRORE CRITICO durante il PUSH di ${tableName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw error;
        }
    }
    console.log("Processo di PUSH completato.");
}

const fetchModifiedCollection = async (collectionName: string, startDate: Date | null): Promise<any[]> => {
    let q;
    if (startDate) {
        q = query(collection(firestore, collectionName), where("updatedAt", ">", Timestamp.fromDate(startDate)));
    } else {
        q = query(collection(firestore, collectionName));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const id = collectionName === 'tecnici' ? data.uid : doc.id;
        return { id, ...data };
    });
};

export async function syncStandard() {
    console.log('Inizio Sincronizzazione Standard...');
    try {
        await pushDirtyData();

        console.log("Avvio del processo di PULL dei dati remoti...");
        const lastSync = await getLastSyncTimestamp();
        const now = new Date();

        if (lastSync) {
            console.log(`... Sincronizzazione incrementale avviata da: ${lastSync.toISOString()}`);
        } else {
            console.log('... Prima sincronizzazione o DB vuoto. Scarico tutti i dati.');
            await db.table('tecnici').clear();
        }

        const anagraficheMap: { [key: string]: (item: any) => any } = {
            tecnici: item => item,
            navi: item => ({ ...item, clienteId: item.clienteId?.id || item.clienteId }),
            luoghi: item => ({ ...item, clienteId: item.clienteId?.id || item.clienteId }),
            tipiGiornata: item => item,
            clienti: item => item,
            ditte: item => item,
            categorie: item => item,
            qualifiche: item => item,
            veicoli: item => item,
        };

        for (const name of ANAGRAFICHE_TABLES) {
            console.log(`... Sincronizzo ${name}...`);
            const data = await fetchModifiedCollection(name as string, lastSync);
            if (data.length > 0) {
                const processedData = data.map(item => convertFirestoreTimestamps(anagraficheMap[name as string](item)));
                await bulkPutAnagrafiche(name as string, processedData);
                console.log(`... Trovati e aggiornati ${data.length} record in ${name}.`);
            } else {
                 console.log(`... Nessun dato da aggiornare per ${name}.`);
            }
        }
        console.log('... PULL di tutte le anagrafiche completato.');
        
        await setLastSyncTimestamp(now);
        console.log('Sincronizzazione Standard completata con successo.');

    } catch (error) {
        console.error('ERRORE CRITICO in Sincronizzazione Standard:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
}

function convertFirestoreTimestamps(data: any): any {
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
}
