
import { collection, getDocs, query, where, Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { db, bulkPutAnagrafiche } from '@/db/db';
import type { Rapportino, Tecnico, Nave, Luogo, TipoGiornata, AdminUser, Cliente, Ditta, Categoria } from '@/models/definitions';
import { rapportinoConverter } from '@/firebase/converters';
import dayjs from 'dayjs';

// --- HELPERS (invariati) ---

const getLastSyncTimestamp = async (): Promise<Date | null> => {
    const lastSync = await db.sync_status.get('lastSyncTimestamp');
    return lastSync ? new Date(lastSync.value) : null;
};

const setLastSyncTimestamp = async (timestamp: Date) => {
    await db.sync_status.put({ id: 'lastSyncTimestamp', value: timestamp.getTime() });
};

const fetchCollection = async <T>(collectionName: string): Promise<any[]> => {
    const querySnapshot = await getDocs(collection(firestore, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const fetchModifiedCollection = async <T>(collectionName: string, startDate: Date): Promise<any[]> => {
    // Aggiunto controllo: se la data è troppo vecchia, Firestore potrebbe rifiutare la query.
    // Per sicurezza, non andiamo più indietro di 30 giorni, che è il default per la prima sync.
    const effectiveStartDate = dayjs().diff(dayjs(startDate), 'day') > 30 ? dayjs().subtract(30, 'days').toDate() : startDate;

    const q = query(
        collection(firestore, collectionName),
        where("updatedAt", ">", Timestamp.fromDate(effectiveStartDate))
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const normalizeId = (id: any): string | undefined => {
    if (typeof id === 'string') return id;
    if (id && typeof id === 'object' && id.id) return id.id;
    return undefined;
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


// --- LOGICA DI SINCRONIZZAZIONE (CORRETTA) ---

export async function syncStandard() {
    console.log('Inizio Sincronizzazione Standard...');
    try {
        const lastSync = await getLastSyncTimestamp();
        const now = new Date();

        // Determina la funzione di fetch da usare: completa se è la prima sync, altrimenti incrementale
        const fetcher = lastSync ? fetchModifiedCollection : fetchCollection;
        const syncStartDate = lastSync || dayjs().subtract(30, 'days').toDate();
        
        if(lastSync){
            console.log(`Sincronizzazione incrementale. Ultima sync: ${lastSync.toISOString()}`);
        } else {
            console.log('Prima sincronizzazione. Scarico tutti i dati anagrafici e i rapportini degli ultimi 30 giorni.');
        }

        const anagraficheCollections = ['tecnici', 'navi', 'luoghi', 'tipiGiornata', 'admins', 'clienti', 'ditte', 'categorie'];
        
        // Esegue il fetch delle anagrafiche in parallelo usando il fetcher corretto
        const anagraficheData = await Promise.all(
            anagraficheCollections.map(name => fetcher(name, syncStartDate))
        );

        // Mappatura per chiarezza
        const [tecniciData, naviData, luoghiData, tipiGiornataData, adminsData, clientiData, ditteData, categorieData] = anagraficheData;

        // Esegue il bulk put nel database locale solo se ci sono dati da aggiornare
        if (anagraficheData.some(data => data.length > 0)) {
            await bulkPutAnagrafiche({ 
                tecnici: convertFirestoreTimestamps(tecniciData),
                navi: convertFirestoreTimestamps(naviData).map((n: any) => ({...n, clienteId: normalizeId(n.clienteId)})),
                luoghi: convertFirestoreTimestamps(luoghiData).map((l: any) => ({...l, clienteId: normalizeId(l.clienteId)})),
                tipiGiornata: convertFirestoreTimestamps(tipiGiornataData),
                admins: convertFirestoreTimestamps(adminsData),
                clienti: convertFirestoreTimestamps(clientiData),
                ditte: convertFirestoreTimestamps(ditteData),
                categorie: convertFirestoreTimestamps(categorieData),
            });
            console.log('Anagrafiche sincronizzate.');
        } else {
            console.log('Nessuna anagrafica da aggiornare.');
        }

        // Sincronizzazione rapportini (logica invariata, era già corretta)
        const rapportiniRecenti = await fetchModifiedCollection<Rapportino>('rapportini', syncStartDate);
        
        if (rapportiniRecenti.length > 0) {
            await saveSafeRapportini(rapportiniRecenti);
            console.log(`Sincronizzati ${rapportiniRecenti.length} rapportini modificati di recente.`);
        } else {
            console.log('Nessun rapportino recente da aggiornare.');
        }
        
        // Aggiorna il timestamp solo alla fine di un'operazione completata con successo
        await setLastSyncTimestamp(now);
        console.log('Sincronizzazione Standard completata con successo.');

    } catch (error) {
        console.error('ERRORE CRITICO in Sincronizzazione Standard:', error);
    }
}

// ... (resto del file invariato) ...

export async function syncCompleta() {
    console.warn('Esecuzione Sincronizzazione Completa (Deprecata)...');
    await syncStandard();
}

async function saveSafeRapportini(rapportiniFromFirestore: any[]) {
    const dirtyIds = await db.rapportini.where('isDirty').equals(1).primaryKeys();
    const rapportiniToSave = rapportiniFromFirestore.filter(r => !dirtyIds.includes(r.id));

    if (rapportiniToSave.length > 0) {
        const rapportiniPuliti = rapportiniToSave.map(r => {
            const rapportinoConDate = convertFirestoreTimestamps(r);
            
            if (rapportinoConDate.data && !rapportinoConDate.dataInizio) {
                rapportinoConDate.dataInizio = rapportinoConDate.data;
            }
            delete rapportinoConDate.data;

            return {
                ...rapportinoConDate,
                naveId: normalizeId(r.naveId),
                luogoId: normalizeId(r.luogoId),
                tipoGiornataId: normalizeId(r.tipoGiornataId),
                tecnicoId: normalizeId(r.tecnicoId),
                presenze: Array.isArray(r.presenze) ? r.presenze.map(normalizeId).filter(Boolean) as string[] : [],
                isDirty: 0,
            };
        });

        await db.rapportini.bulkPut(rapportiniPuliti);
    }
}

export async function pushRapportinoToQueue(rapportinoId: string) {
    await db.sync_queue.add({
        entityId: rapportinoId,
        entityType: 'rapportino',
        timestamp: Date.now(),
        status: 'pending',
        attempts: 0,
    });
    processSyncQueue(); 
}

let isSyncing = false;
export async function processSyncQueue() {
    if (isSyncing) return;
    isSyncing = true;

    try {
        const tasks = await db.sync_queue.where('status').equals('pending').sortBy('timestamp');
        if (tasks.length === 0) {
            isSyncing = false;
            return;
        }

        const batch = writeBatch(firestore);
        let processedTaskIds: number[] = [];

        for (const task of tasks) {
            if (task.entityType === 'rapportino') {
                const rapportino = await db.rapportini.get(task.entityId);
                if (rapportino) {
                    const docRef = doc(firestore, 'rapportini', rapportino.id).withConverter(rapportinoConverter);
                    batch.set(docRef, rapportino);
                    await db.rapportini.update(rapportino.id, { isDirty: 0 });
                    processedTaskIds.push(task.id!);
                }
            }
        }

        await batch.commit();
        await db.sync_queue.bulkDelete(processedTaskIds);

    } catch (error) {
        console.error('ERRORE durante il processo della coda di sincronizzazione:', error);
    } finally {
        isSyncing = false;
        const remainingTasks = await db.sync_queue.where('status').equals('pending').count();
        if (remainingTasks > 0) {
            setTimeout(processSyncQueue, 1000); 
        }
    }
}
